import type { GraphDeps } from "./deps.js";
import type { MessageContent } from "@langchain/core/messages";
import type { FlowNodeRef } from "./flow-nodes.js";
import type { FlowStateType, FlowStateUpdate } from "./flow-state.js";
import type { JoinOutput, ForkOutput } from "./fork-join.js";
import { checkVisit, type ResolvedLimits } from "./limits.js";
import { isWorkingKind } from "./node-kind.js";
import type { AsyncNode } from "./types.js";
import type { Contribution } from "./contributions.js";
import {
  QuorumCancelledError,
  type BranchCancelToken,
  type QuorumManager,
} from "../concurrency/quorum-manager.js";

/** What runs one flow node. A node may invoke a compiled subgraph inside (see `subgraphNode`). */
export type FlowNodeRunner = AsyncNode<FlowStateType, FlowStateUpdate>;

/** The workflow's spend today, read once per run (for `limits.perDay.cost`). */
export type SpentToday = () => Promise<number>;

export interface VisitDeps {
  readonly limits: ResolvedLimits;
  readonly quorumRouters?: GraphDeps<string>["quorumRouters"];
  readonly spentToday: SpentToday;
  /** A router's `maxVisits`. */
  readonly maxVisits?: number;
  readonly catchesErrors?: boolean;
}

async function daySpentBeforeRun(state: FlowStateType, deps: VisitDeps): Promise<number> {
  if (state.daySpentBeforeRunUsd !== null) return state.daySpentBeforeRunUsd;
  return deps.limits.dayCostUsd === undefined ? 0 : deps.spentToday();
}

/** Check if node class implements JoinHandler. */
interface HasOnJoin {
  onJoin(outputs: Record<string, ForkOutput<unknown>>): Promise<JoinOutput>;
}

async function joinUpdateOf(node: FlowNodeRef, state: FlowStateType): Promise<FlowStateUpdate> {
  const forks = state.forks;
  if (Object.keys(forks).length === 0) return {};
  try {
    const ClassNode = node.use as new () => HasOnJoin;
    const instance = new ClassNode();
    if (typeof instance.onJoin === "function") {
      const output = await instance.onJoin(forks);
      const update: FlowStateUpdate = {};
      if (output.contributions) {
        update.contributions = output.contributions.map(
          (c: { agent?: string; content: MessageContent }) => ({
            agent: c.agent ?? node.name,
            content: c.content,
          }),
        );
      }
      if (output.payload) update.payload = output.payload;
      if (output.update) Object.assign(update, output.update);
      return update;
    }
  } catch {
    // Ignore instantiation errors for nodes without default constructor or onJoin
  }
  return {};
}

function mergeJoinState(state: FlowStateType, joinUpdate: FlowStateUpdate): FlowStateType {
  const contributions = joinUpdate.contributions
    ? [...state.contributions, ...(joinUpdate.contributions as Contribution[])]
    : state.contributions;
  const payload = joinUpdate.payload ? { ...state.payload, ...joinUpdate.payload } : state.payload;

  return { ...state, ...joinUpdate, contributions, payload } as FlowStateType;
}

function mergeJoinUpdate(update: FlowStateUpdate, joinUpdate: FlowStateUpdate): FlowStateUpdate {
  const contributions =
    joinUpdate.contributions && Array.isArray(update.contributions)
      ? [...(joinUpdate.contributions as Contribution[]), ...update.contributions]
      : (joinUpdate.contributions ?? update.contributions);

  const payload = joinUpdate.payload
    ? { ...(update.payload ?? {}), ...joinUpdate.payload }
    : update.payload;

  const merged = { ...update };
  if (contributions !== undefined) merged.contributions = contributions;
  if (payload !== undefined) merged.payload = payload;
  return merged;
}

/**
 * Wraps a node's runner with the flow's bookkeeping: every visit is added to the path and the
 * node's visits; a working node (agent, router) is a step — its limits are checked before it runs.
 */
export interface QuorumContext {
  quorumId: string;
  min: number;
  max?: number;
  timeoutSeconds?: number;
  routerClass: string;
}

// eslint-disable-next-line max-lines-per-function
export function visitNode(
  node: FlowNodeRef,
  runner: FlowNodeRunner,
  deps: VisitDeps,
  quorumContext?: QuorumContext,
): FlowNodeRunner {
  const visited = { visits: { [node.key]: 1 }, path: [node.key] };
  if (!isWorkingKind(node.kind)) {
    return async (state, config) => {
      const joinUpdate = await joinUpdateOf(node, state);
      const res = await runner(mergeJoinState(state, joinUpdate), config);
      return {
        ...res,
        ...visited,
        ...mergeJoinUpdate(res, joinUpdate),
        // we do NOT clear forks for non-working nodes, because they might be intermediate
      };
    };
  }

  // eslint-disable-next-line max-lines-per-function, complexity
  return async (state, config) => {
    let branchCancelToken: BranchCancelToken | undefined;
    let manager: QuorumManager | undefined;
    let branchConfig = config;

    if (quorumContext && config?.configurable?.quorumManager) {
      manager = config.configurable.quorumManager as QuorumManager;
      branchCancelToken = { cancelled: false };
      manager.registerBranch(
        quorumContext.quorumId,
        quorumContext.min,
        branchCancelToken,
        quorumContext.max,
        quorumContext.timeoutSeconds,
      );

      if (branchCancelToken.cancelled) return {};

      branchConfig = {
        ...config,
        configurable: { ...config.configurable, branchCancelToken },
      };
    }

    const daySpent = await daySpentBeforeRun(state, deps);
    checkVisit(state, {
      node,
      limits: deps.limits,
      daySpentBeforeRunUsd: daySpent,
      ...(deps.maxVisits === undefined ? {} : { maxVisits: deps.maxVisits }),
    });

    try {
      const joinUpdate = await joinUpdateOf(node, state);
      const update = await runner(mergeJoinState(state, joinUpdate), branchConfig);

      if (quorumContext && manager && deps.quorumRouters) {
        const strategy = deps.quorumRouters(quorumContext.routerClass);
        if (strategy) {
          const isVoteValid = await strategy.filterVote({ ...state, ...update });
          manager.addVote(quorumContext.quorumId, isVoteValid);
        }
      }

      return {
        ...update,
        // a nested workflow's runner reports its own node, path, visits and steps (`childDelta`)
        ...(node.kind === "workflow" ? {} : { ...visited, steps: 1 }),
        ...mergeJoinUpdate(update, joinUpdate),
        daySpentBeforeRunUsd: daySpent,
        ...(node.kind === "agent" ? { previousAgent: node.key } : {}),
      };
    } catch (err) {
      if (err instanceof QuorumCancelledError) {
        return {};
      }
      if (deps.catchesErrors) {
        return { lastError: err as Error };
      }
      throw err;
    }
  };
}
