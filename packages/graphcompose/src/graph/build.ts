import type { BaseCheckpointSaver } from "@langchain/langgraph";
import { END, START, StateGraph } from "@langchain/langgraph";
import type { Router } from "../routers/index.js";
import { checkFlow, type FlowModel } from "./check-flow.js";
import type { Flow } from "./flow.js";
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
  /** The runner of an entry, agent or conclusion (routers are the engine's own). */
  readonly runnerFor: (node: FlowNodeRef) => FlowNodeRunner;
  /** The routing strategy of a router (its own model). */
  readonly routerFor: (router: LoadedRouter) => Router;
  readonly routerMemory: MemoryLimits;
  readonly limits: WorkflowLimits;
  readonly spentToday: SpentToday;
  readonly checkpointer?: BaseCheckpointSaver;
}

/** LangGraph's `recursionLimit` is a safety net far above the steps limit, never the limit a user sees. */
export const RECURSION_SAFETY_FACTOR = 10;

export class UnknownEntryError extends Error {
  override name = "UnknownEntryError";
}

type Builder = StateGraph<typeof FlowState.spec, FlowStateType, FlowStateUpdate, string>;

function runnerOf(
  node: FlowNodeRef,
  model: FlowModel,
  runtime: FlowRuntime,
  routers: ReadonlyMap<string, LoadedRouter>,
): { readonly runner: FlowNodeRunner; readonly maxVisits?: number } {
  const loaded = routers.get(node.name);
  if (node.kind !== "router" || loaded === undefined) return { runner: runtime.runnerFor(node) };
  const conclusion = loaded.routes.find(
    (item) => model.nodes.get(item.option)?.kind === "conclusion",
  )?.option;
  const runner = makeFlowRouterNode({
    router: runtime.routerFor(loaded),
    loaded,
    memory: runtime.routerMemory,
    ...(conclusion === undefined ? {} : { conclusion }),
  });
  return loaded.maxVisits === undefined ? { runner } : { runner, maxVisits: loaded.maxVisits };
}

/**
 * The LangGraph node of a flow node: `<kind>.<name>` (e.g. `conclusion.answer`) — flow names may
 * equal state keys (`answer`), which LangGraph does not allow as node names.
 */
export const graphNodeId = (node: Pick<FlowNodeRef, "kind" | "name">): string =>
  `${node.kind}.${node.name}`;

/** A node of a checked flow by name (every transition target is a node once the rules pass). */
function nodeNamed(model: FlowModel, name: string): FlowNodeRef {
  const ref = model.nodes.get(name);
  if (ref === undefined) throw new Error(`Flow node "${name}" is missing after the rules passed`);
  return ref;
}

/** Node name → graph node id, for the given names (a conditional edge's path map). */
const pathMap = (model: FlowModel, names: readonly string[]): Record<string, string> =>
  Object.fromEntries(names.map((name) => [name, graphNodeId(nodeNamed(model, name))]));

function entryEdges(builder: Builder, model: FlowModel): void {
  const entries = [...model.nodes.values()].filter((ref) => ref.kind === "entry");
  const [only] = entries;
  if (entries.length === 1 && only !== undefined) {
    builder.addEdge(START, graphNodeId(only));
    return;
  }
  const names = entries.map((ref) => ref.name);
  const pick = (state: FlowStateType): string => {
    if (names.includes(state.entry)) return state.entry;
    throw new UnknownEntryError(`Unknown entry "${state.entry}"; entries: ${names.join(", ")}`);
  };
  builder.addConditionalEdges(START, pick, pathMap(model, names));
}

/** After an entry: a tripped input guard ends the run before any working node spends money. */
const afterEntry =
  (target: string) =>
  (state: FlowStateType): string =>
    state.guarded === "" ? target : END;

function nodeEdges(builder: Builder, model: FlowModel, node: FlowNodeRef): void {
  const next = model.next.get(node.name);
  const id = graphNodeId(node);
  if (node.kind === "conclusion" || next === undefined) {
    builder.addEdge(id, END);
    return;
  }
  if (next.kind === "to") {
    const target = graphNodeId(nodeNamed(model, next.target));
    if (node.kind === "entry") {
      builder.addConditionalEdges(id, afterEntry(target), [target, END]);
      return;
    }
    builder.addEdge(id, target);
    return;
  }
  const self = next.self ? predecessorsOf(model.collected, node.name).map((ref) => ref.name) : [];
  const targets = [...new Set([...next.targets, ...self])];
  builder.addConditionalEdges(id, (state: FlowStateType) => state.next, pathMap(model, targets));
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
  entryEdges(builder, model);
  for (const node of model.nodes.values()) nodeEdges(builder, model, node);
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
 * decision; entries from `START`, conclusions to `END`.
 */
export async function assembleFlowGraph(flow: Flow, runtime: FlowRuntime): Promise<FlowGraph> {
  const model = checkFlow(flow);
  const routers = await loadRouters(model);
  const limits = resolveLimits(runtime.limits, model);
  const { graph, recursionLimit } = compileFlow(model, runtime, routers, limits);
  return { graph, model, limits, recursionLimit };
}
