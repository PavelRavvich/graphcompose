/* eslint-disable complexity, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable max-lines, max-lines-per-function */

import type { BaseCheckpointSaver } from "@langchain/langgraph";
import { END, START, Send, StateGraph } from "@langchain/langgraph";
import type { Router } from "../routers/index.js";
import { checkFlow, type FlowModel } from "./check-flow.js";
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
    if (t.next.kind === "join" || t.next.kind === "joinAny" || t.next.kind === "joinQuorum") {
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
 * equal state keys (`answer`), which LangGraph does not allow as node names.
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
  parallels: readonly { optionName: string; targets: string[] }[] = [],
): Record<string, any> =>
  Object.fromEntries([
    ...keys.map((key) => {
      if (key === "skip-wrap") return ["skip-wrap", "skip-wrap"];
      if (key === END) return [END, END];
      return [key, graphNodeId(nodeKeyed(model, key))];
    }),
  ]);

function startEdges(builder: Builder, model: FlowModel): void {
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
const afterStart =
  (target: string) =>
  (state: FlowStateType): string =>
    state.guarded === "" ? target : END;

function nodeEdges(builder: Builder, model: FlowModel, node: FlowNodeRef): void {
  const next = model.next.get(node.key);
  const id = graphNodeId(node);
  if (node.kind === "workflow-finish" || (next === undefined && node.kind !== "agent")) {
    builder.addEdge(id, END);
    return;
  }
  if (!next) return;
  if (next.kind === "to") {
    const targets = next.targets.map((t) => graphNodeId(nodeKeyed(model, t)));
    if (node.kind === "workflow-start") {
      const singleTarget = targets.length === 1 && targets[0] !== undefined;
      builder.addConditionalEdges(
        id,
        singleTarget
          ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            afterStart(targets[0]!)
          : (state) => (state.guarded === "" ? targets : [END]),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        singleTarget ? [targets[0]!, END] : undefined,
      );
      return;
    }
    builder.addConditionalEdges(id, () => targets);
    return;
  }
  if (next.kind === "nextEach") {
    const targetId = graphNodeId(nodeKeyed(model, next.target));
    builder.addConditionalEdges(id, (state) => {
      // In a real implementation we would extract items from state payload here
      // For now, we simulate map-reduce by sending 1 item to the target
      // This allows the graph to compile correctly
      return [new Send(targetId, state)];
    });
    return;
  }
  if (next.kind === "join" || next.kind === "joinAny" || next.kind === "joinQuorum") {
    const targetId = graphNodeId(nodeKeyed(model, next.target));
    const wrapperId = `join-wrap.${targetId}.${node.key}`;
    builder.addEdge(id, wrapperId);
    return;
  }
  const self = next.self ? predecessorsOf(model.collected, node.key).map((ref) => ref.key) : [];

  const ret = (next as any).return ? ["skip-wrap"] : [];
  const end = (next as any).end ? [END] : [];
  const targets = [...new Set([...next.targets, ...self, ...ret, ...end])];
  const parallels = (next as any).parallelTargets || [];

  builder.addConditionalEdges(
    id,
    (state: FlowStateType) => {
      // If the router chose "skip", we map it to "skip-wrap"
      if (state.next === "Return") return "skip-wrap";
      if (state.next === "End") return END;
      const pMatch = parallels.find((p: any) => p.optionName === state.next);
      if (pMatch) {
        return pMatch.targets.map((t: any) => new Send(graphNodeId(nodeKeyed(model, t)), state));
      }
      return state.next;
    },
    pathMap(model, targets, parallels),
  );
  return;
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
    if (t.next.kind === "join" || t.next.kind === "joinAny" || t.next.kind === "joinQuorum") {
      const targetNode = nodeKeyed(model, t.next.target);
      if (!joins.has(targetNode.key)) {
        joins.set(targetNode.key, {
          target: targetNode,
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
  for (const node of model.nodes.values()) {
    const { runner, maxVisits } = runnerOf(node, model, runtime, routers);
    const deps = {
      limits,
      spentToday: runtime.spentToday,
      ...(maxVisits === undefined ? {} : { maxVisits }),
    };
    builder.addNode(graphNodeId(node), visitNode(node, runner, deps));
  }
  startEdges(builder, model);
  for (const node of model.nodes.values()) nodeEdges(builder, model, node);
  compileJoinBarriers(builder, model);
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
