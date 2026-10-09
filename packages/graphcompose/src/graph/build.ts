/* eslint-disable */
import type { QuorumContext } from "./visit.js";
import { quorumRouterMetaOf } from "../concurrency/quorum.decorator.js";
/* eslint-disable complexity, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable max-lines, max-lines-per-function */

import type { BaseCheckpointSaver } from "@langchain/langgraph";
import { END, START, Send, StateGraph } from "@langchain/langgraph";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { componentOf } from "../components/metadata.js";
import type { Router } from "../routers/index.js";
import { checkFlow, type FlowModel } from "./check-flow.js";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { unwrapTarget, type Flow } from "./flow.js";
import type { FlowNodeRef } from "./flow-nodes.js";
import { FlowState, type FlowStateType, type FlowStateUpdate } from "./flow-state.js";
import { resolveLimits, type ResolvedLimits } from "./limits.js";
import { makeFlowRouterNode, type MemoryLimits } from "./nodes/flow-router.js";
import { predecessorsOf } from "./router-rules.js";
import { loadRouters, type LoadedRouter } from "./router-texts.js";
import type { WorkflowLimits } from "./settings.js";
import { visitNode, type FlowNodeRunner, type SpentToday } from "./visit.js";

/** What the engine needs from the outside to run a flow. */
export interface FlowRuntime {
  /** The runner of a workflow start, agent or workflow finish (routers are the engine's own). */
  readonly runnerFor: (node: FlowNodeRef) => FlowNodeRunner;
  /** The routing strategy of a router (its own model). */
  readonly routerFor: (router: LoadedRouter) => Router;
  readonly routerMemory: MemoryLimits;
  readonly limits: WorkflowLimits;
  readonly spentToday: SpentToday;
  readonly checkpointer?: BaseCheckpointSaver;
  readonly observer?: import("../core/observer-manager.js").ObserverManager;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  readonly container?: { get: <T>(token: any) => T };
  readonly quorumRouters?: (
    name: string,
  ) => import("../concurrency/quorum.decorator.js").QuorumStrategy;
  readonly batchStrategies?: (
    name: string,
  ) => import("../concurrency/batch.decorator.js").BatchParallelStrategy<any, any>;
}

/** LangGraph's `recursionLimit` is a safety net far above the steps limit, never the limit a user sees. */
const RECURSION_SAFETY_FACTOR = 10;

export class UnknownWorkflowStartError extends Error {
  override name = "UnknownWorkflowStartError";
}

type Builder = StateGraph<typeof FlowState.spec, FlowStateType, FlowStateUpdate, string>;

function runnerOf(
  node: FlowNodeRef,
  model: FlowModel,
  runtime: FlowRuntime,
  routers: ReadonlyMap<string, LoadedRouter>,
): { readonly runner: FlowNodeRunner; readonly maxVisits?: number } {
  const loaded = routers.get(node.key);
  if (node.kind !== "router" || loaded === undefined) return { runner: runtime.runnerFor(node) };

  const isQuorumRouter = Array.from(model.nodes.values()).some(
    (n) => n.key === node.key && quorumRouterMetaOf(n.use),
  );
  if (isQuorumRouter) {
    return {
      runner: async (state, config) => {
        const strategy = runtime.quorumRouters?.(node.use.name);
        if (!strategy) throw new Error("Missing QuorumStrategy in AppDeps for " + node.use.name);

        let hasQuorum = false;
        if (config?.configurable?.quorumManager) {
          const manager = config.configurable
            .quorumManager as import("../concurrency/quorum-manager.js").QuorumManager;
          hasQuorum = manager.isQuorumMet(node.key);
        }

        const target = await strategy.route(state, hasQuorum);
        return {
          next:
            typeof target === "string"
              ? target
              : "name" in target
                ? target.name
                : (target as any).kind,
        };
      },
    };
  }
  const finish = loaded.routes.find(
    (item) => model.nodes.get(item.option)?.kind === "workflow-finish",
  )?.option;
  const runner = makeFlowRouterNode({
    router: runtime.routerFor(loaded),
    loaded,
    memory: runtime.routerMemory,
    observer: runtime.observer,
    ...(finish === undefined ? {} : { finish }),
  });
  const skipping = reportingSkippedBranches(runner, loaded, joinSourceKeys(model));
  return loaded.maxVisits === undefined
    ? { runner: skipping }
    : { runner: skipping, maxVisits: loaded.maxVisits };
}

/** Keys of every node that feeds a join barrier. */
function joinSourceKeys(model: FlowModel): ReadonlySet<string> {
  const keys = new Set<string>();
  for (const t of model.collected.transitions) {
    if (t.next.kind === "join") {
      keys.add(t.from);
    }
  }
  return keys;
}

/**
 * A router that does not choose a branch leading into a join barrier would leave the barrier
 * waiting for it forever. After each decision, the unchosen join sources are reported to the
 * barrier as `skipped` (they count as arrived, and the join handler sees their status).
 */
function reportingSkippedBranches(
  runner: FlowNodeRunner,
  loaded: LoadedRouter,
  joinSources: ReadonlySet<string>,
): FlowNodeRunner {
  const skippable = loaded.routes.map((r) => r.option).filter((o) => joinSources.has(o));
  if (skippable.length === 0) return runner;
  return async (state, config) => {
    const update = await runner(state, config);
    const chosen = update.next;
    const skipped = skippable.filter((key) => key !== chosen);
    if (skipped.length === 0) return update;
    const forks = Object.fromEntries(
      skipped.map((key) => [key, { data: "", name: key, status: "skipped" as const }]),
    );
    return { ...update, forks: { ...(update.forks ?? {}), ...forks } };
  };
}

/**
 * The LangGraph node of a flow node: `<kind>.<name>` (e.g. `workflow-finish.chat`) — flow names may
 * equal state keys (`replyWith`), which LangGraph does not allow as node names.
 */
export const graphNodeId = (node: Pick<FlowNodeRef, "kind" | "name">): string =>
  `${node.kind}.${node.name}`;

/** A node of a checked flow by key (every transition target is a node once the rules pass). */
function nodeKeyed(model: FlowModel, key: string): FlowNodeRef {
  const ref = model.nodes.get(key);
  if (ref === undefined) throw new Error(`Flow node "${key}" is missing after the rules passed`);
  return ref;
}

/** Node key → graph node id, for the given keys (a conditional edge's path map). */
const pathMap = (
  model: FlowModel,
  keys: readonly string[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  parallels: readonly { optionName: string; targets: string[] }[] = [],
): Record<string, any> =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  Object.fromEntries([
    ...keys.map((key) => {
      if (key === "skip-wrap") return ["skip-wrap", "skip-wrap"];
      if (key === END) return [END, END];
      return [key, graphNodeId(nodeKeyed(model, key))];
    }),
  ]);

function nodeEdges(builder: Builder, model: FlowModel, node: FlowNodeRef, deps: any): void {
  const next = model.next.get(node.key);
  const id = graphNodeId(node);
  wireEdgesForId(builder, model, node, next, id, deps);

  const isBatchTarget = model.collected.transitions.some(
    (t) => t.next.kind === "batchParallel" && t.next.target === node.key,
  );
  if (isBatchTarget) {
    wireEdgesForId(builder, model, node, next, `${id}_batch_finish`, deps);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function startEdges(builder: Builder, model: FlowModel, deps: any): void {
  const starts = [...model.nodes.values()].filter((ref) => ref.kind === "workflow-start");
  const [only] = starts;
  if (starts.length === 1 && only !== undefined) {
    builder.addEdge(START, graphNodeId(only));
    return;
  }
  const names = starts.map((ref) => ref.name);
  const pick = (state: FlowStateType): string => {
    if (names.includes(state.start)) return state.start;
    throw new UnknownWorkflowStartError(
      `Unknown workflow start "${state.start}"; workflow starts: ${names.join(", ")}`,
    );
  };
  builder.addConditionalEdges(
    START,
    pick,
    Object.fromEntries(starts.map((ref) => [ref.name, graphNodeId(ref)])),
  );
}

/** After a workflow start: a tripped input guard ends the run before any working node spends money. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const afterStart =
  (target: string) =>
  (state: FlowStateType): string =>
    state.guarded === "" ? target : END;

function wireEdgesForId(
  builder: Builder,
  model: FlowModel,
  node: FlowNodeRef,
  next: any,
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  deps: any,
): void {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const catches = model.catches.get(node.key) || [];

  if (catches.length > 0) {
    // If we have catch blocks, we MUST use conditional edges
    builder.addConditionalEdges(id, (state: any) => {
      if (state.lastError) {
        for (const catchNode of catches) {
          if (catchNode.kind === "catch") {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            const err = state.lastError as any;
            const isMatch =
              err instanceof catchNode.errorType ||
              (err.cause && err.cause instanceof catchNode.errorType);
            if (isMatch) return graphNodeId(nodeKeyed(model, catchNode.nextNode));
          }
        }
        // Unhandled error
        throw state.lastError;
      }

      // Happy path
      if (node.kind === "workflow-finish" || (next === undefined && node.kind !== "agent")) {
        return END;
      }
      if (!next) return END; // Agent without next implies END? wait, no.

      if (next.kind === "to") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
        const targets = next.targets.map((t: any) => graphNodeId(nodeKeyed(model, t)));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return targets;
      }
      if (next.kind === "choose") {
        const self = next.self
          ? predecessorsOf(model.collected, node.key).map((ref) => ref.key)
          : [];
        const ret = next.return ? ["skip-wrap"] : [];
        const end = next.end || next.quorumRouter ? [END] : [];
        const targets = [...new Set([...next.targets, ...self, ...ret, ...end])];
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        const parallels = next.parallelTargets || [];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const map = pathMap(model, targets, parallels);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        if (state.next === "Return") return map["skip-wrap"];
        if (state.next === "End") return END;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const pMatch = parallels.find((p: any) => p.optionName === state.next);
        if (pMatch) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
          return pMatch.targets.map((t: any) => new Send(graphNodeId(nodeKeyed(model, t)), state));
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return map[state.next] ?? state.next;
      }
      if (next.kind === "join") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const targetId = graphNodeId(nodeKeyed(model, next.target));
        return `join-wrap.${targetId}.${node.key}`;
      }
      if (next.kind === "batchParallel") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        return graphNodeId(nodeKeyed(model, next.target));
      }
      return END;
    });
    return;
  }

  // Original fast-path wiring
  if (node.kind === "workflow-finish" || (next === undefined && node.kind !== "agent")) {
    builder.addEdge(id, END);
    return;
  }
  if (!next) return;
  if (next.kind === "to") {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
    const targets = next.targets.map((t: any) => graphNodeId(nodeKeyed(model, t)));
    if (node.kind === "workflow-start") {
      const singleTarget = targets.length === 1 && targets[0] !== undefined;
      builder.addConditionalEdges(
        id,
        singleTarget
          ? (state) => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return state.guarded
                ? END
                : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                  state.optionalBranches?.includes(node.key)
                  ? "__skip__"
                  : targets[0];
            }
          : (state) => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return state.guarded
                ? [END]
                : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                  state.optionalBranches?.includes(node.key)
                  ? ["__skip__"]
                  : targets;
            },
      );
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      for (const t of targets) builder.addEdge(id, t);
    }
  } else if (next.kind === "choose") {
    const self = next.self ? predecessorsOf(model.collected, node.key).map((ref) => ref.key) : [];
    const ret = next.return ? ["skip-wrap"] : [];
    const end = next.end || next.quorumRouter ? [END] : [];
    const targets = [...new Set([...next.targets, ...self, ...ret, ...end])];
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const parallels = next.parallelTargets || [];

    builder.addConditionalEdges(
      id,
      (state: FlowStateType) => {
        if (!state.next) return END;
        if (state.next === "Return") return "skip-wrap";
        if (state.next === "End") return END;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const pMatch = parallels.find((p: any) => p.optionName === state.next);
        if (pMatch) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
          return pMatch.targets.map((t: any) => new Send(graphNodeId(nodeKeyed(model, t)), state));
        }
        // Check if state.next is a key in pathMap keys! If not, fallback to END.
        return state.next in pathMap(model, targets, parallels) ? state.next : END;
      },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      pathMap(model, targets, parallels),
    );
  } else if (next.kind === "join") {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const targetId = graphNodeId(nodeKeyed(model, next.target));
    builder.addEdge(id, `join-wrap.${targetId}.${node.key}`);
  } else if (next.kind === "batchParallel") {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    builder.addEdge(id, `__mapeach_${node.key}_to_${next.target}`);
  }
}
function compileJoinBarriers(builder: Builder, model: FlowModel) {
  const joins = new Map<
    string,
    {
      target: FlowNodeRef;
      sources: FlowNodeRef[];
      type: "join" | "joinAny" | "joinQuorum";
      count?: number;
    }
  >();
  for (const t of model.collected.transitions) {
    if (t.next.kind === "join") {
      const targetNode = nodeKeyed(model, t.next.target);
      if (!joins.has(targetNode.key)) {
        joins.set(targetNode.key, {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
          target: targetNode as any,
          sources: [],
          type: t.next.kind,

          count: (t.next as any).count,
        });
      }
      const join = joins.get(targetNode.key);
      if (join !== undefined) join.sources.push(nodeKeyed(model, t.from));
    }
  }

  // Add global skip-wrap
  builder.addNode("skip-wrap", () => ({}));
  if (joins.size === 0) {
    builder.addEdge("skip-wrap", END);
  } else {
    builder.addConditionalEdges("skip-wrap", (state) => {
      return [...joins.values()].map(
        (j) => new Send(`join-barrier.${graphNodeId(j.target)}`, state),
      );
    });
  }

  for (const { target, sources, type, count } of joins.values()) {
    const targetId = graphNodeId(target);
    const barrierId = `join-barrier.${targetId}`;
    const waitId = `join-wait.${targetId}`;

    builder.addNode(waitId, () => ({}));
    builder.addEdge(waitId, END);

    builder.addNode(barrierId, () => ({}));
    builder.addConditionalEdges(barrierId, (state) => {
      if (type === "joinAny") {
        const anyArrived = sources.some((src) => state.forks[src.key] !== undefined);

        return anyArrived ? [targetId] : [waitId];
      }
      if (type === "joinQuorum") {
        const arrivedCount = sources.filter((src) => state.forks[src.key] !== undefined).length;
        return arrivedCount >= (count ?? 1) ? [targetId] : [waitId];
      }
      // default join (all)
      const allArrived = sources.every((src) => state.forks[src.key] !== undefined);
      return allArrived ? [targetId] : [waitId];
    });

    for (const src of sources) {
      const wrapperId = `join-wrap.${targetId}.${src.key}`;
      builder.addNode(wrapperId, (state) => {
        const lastContrib = [...state.contributions].reverse().find((c) => c.agent === src.name);
        return {
          forks: {
            [src.key]: { data: lastContrib?.content ?? "", name: src.name, status: "completed" },
          },
        };
      });
      builder.addEdge(wrapperId, barrierId);
    }
  }
}

function compileFlow(
  model: FlowModel,
  runtime: FlowRuntime,
  routers: ReadonlyMap<string, LoadedRouter>,
  limits: ResolvedLimits,
) {
  const builder: Builder = new StateGraph<
    typeof FlowState.spec,
    FlowStateType,
    FlowStateUpdate,
    string
  >(FlowState);
  const sharedDeps = {
    limits,
    spentToday: runtime.spentToday,
    quorumRouters: runtime.quorumRouters,
    container: runtime.container,
    keyOf: model.collected.keyOf,
  };
  for (const node of model.nodes.values()) {
    const { runner, maxVisits } = runnerOf(node, model, runtime, routers);
    const deps = {
      ...sharedDeps,
      limits,
      spentToday: runtime.spentToday,
      quorumRouters: runtime.quorumRouters,
      container: runtime.container,
      ...(maxVisits === undefined ? {} : { maxVisits }),
    };

    let quorumContext: QuorumContext | undefined;
    const isQuorumTarget = model.collected.transitions.find(
      // eslint-disable-next-line @typescript-eslint/prefer-optional-chain, @typescript-eslint/no-unnecessary-condition
      (t) => t.from === node.key && t.next && t.next.kind === "choose" && t.next.quorumRouter,
    );
    if (
      // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
      isQuorumTarget &&
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      isQuorumTarget.next &&
      isQuorumTarget.next.kind === "choose" &&
      isQuorumTarget.next.quorumRouter
    ) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const min = isQuorumTarget.next.quorumMin!;
      const max = isQuorumTarget.next.quorumMax;
      const timeoutSeconds = isQuorumTarget.next.quorumTimeoutSeconds;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (min !== undefined) {
        quorumContext = {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion
          quorumId: isQuorumTarget.next.quorumRouter!,
          min: min,
          max: max,
          timeoutSeconds: timeoutSeconds,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion
          routerClass: isQuorumTarget.next.quorumRouter!,
        };
      }
    }

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const hasCatches = (model.catches.get(node.key) || []).length > 0;
    const visitDeps = { ...deps, catchesErrors: hasCatches };
    builder.addNode(graphNodeId(node), visitNode(node, runner, visitDeps, quorumContext));

    const isBatchTarget = model.collected.transitions.some(
      (t) => t.next.kind === "batchParallel" && t.next.target === node.key,
    );
    if (isBatchTarget) {
      builder.addNode(
        `${graphNodeId(node)}_batch_clone`,
        visitNode(node, runner, visitDeps, quorumContext),
      );
    }
  }
  startEdges(builder, model, sharedDeps);
  for (const node of model.nodes.values()) nodeEdges(builder, model, node, sharedDeps);
  compileJoinBarriers(builder, model);
  compileBatchParallelLoops(builder, model, sharedDeps);
  const recursionLimit = (limits.steps + model.nodes.size) * RECURSION_SAFETY_FACTOR;
  const compiled = builder.compile(
    runtime.checkpointer === undefined ? {} : { checkpointer: runtime.checkpointer },
  );
  return { graph: compiled.withConfig({ recursionLimit }), recursionLimit };
}

export type CompiledFlowGraph = ReturnType<typeof compileFlow>["graph"];

/** A flow assembled into a LangGraph graph. */
export interface FlowGraph {
  readonly graph: CompiledFlowGraph;
  readonly model: FlowModel;
  readonly limits: ResolvedLimits;
  readonly recursionLimit: number;
}

/**
 * Checks the flow (all rules, before any model call), loads router texts and builds the LangGraph
 * graph: one graph node per flow node; `to` → edges; `choose` → a conditional edge on the router's
 * decision; workflow starts from `START`, workflow finishes to `END`.
 */
export async function assembleFlowGraph(flow: Flow, runtime: FlowRuntime): Promise<FlowGraph> {
  const model = checkFlow(flow);
  const routers = await loadRouters(model);
  const limits = resolveLimits(runtime.limits, model);
  const { graph, recursionLimit } = compileFlow(model, runtime, routers, limits);
  return { graph, model, limits, recursionLimit };
}

function compileBatchParallelLoops(builder: Builder, model: FlowModel, deps: any) {
  const batchParallelTransitions = model.collected.transitions.filter(
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-optional-chain
    (t) => t.next && t.next.kind === "batchParallel",
  );

  for (const t of batchParallelTransitions) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-optional-chain
    if (!t.next || t.next.kind !== "batchParallel") continue;

    const next = t.next;
    const sourceNodeKey = t.from;
    const targetNodeKey = next.target;
    const targetNode = nodeKeyed(model, targetNodeKey);

    const loopNodeId = `__mapeach_${sourceNodeKey}_to_${targetNodeKey}`;
    const targetCloneId = `${graphNodeId(targetNode)}_batch_clone`;

    builder.addNode(loopNodeId, async (state: any) => {
      let queue = state._batchCursor?.[targetNodeKey]?.queue;
      if (queue === undefined) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const strategy = deps.container.get(next.strategy);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        queue = await strategy.extract(state);
      }

      const limit = next.options.concurrencyLimit;
      const batchSize = next.options.batchSize;
      const activeBatch = [];
      let newQueue = queue;
      for (let i = 0; i < limit && newQueue.length > 0; i++) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        activeBatch.push(newQueue.slice(0, batchSize));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        newQueue = newQueue.slice(batchSize);
      }

      return {
        _batchCursor: {
          [targetNodeKey]: { queue: newQueue, activeBatch },
        },
      };
    });

    builder.addConditionalEdges(loopNodeId, (state: any) => {
      const activeBatch = state._batchCursor[targetNodeKey].activeBatch;

      if (!activeBatch || activeBatch.length === 0) {
        const outgoing = model.collected.transitions.find((tr) => tr.from === targetNodeKey);
        // eslint-disable-next-line @typescript-eslint/prefer-optional-chain, @typescript-eslint/no-unnecessary-condition
        if (!outgoing || !outgoing.next) return END;
        if (outgoing.next.kind === "to")
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          return graphNodeId(nodeKeyed(model, outgoing.next.targets[0]!));
        if (outgoing.next.kind === "join")
          return graphNodeId(nodeKeyed(model, outgoing.next.target));
        return END;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return activeBatch.map((item: any) => new Send(targetCloneId, { batchItem: item }));
    });

    builder.addEdge(targetCloneId, loopNodeId);
  }
}
