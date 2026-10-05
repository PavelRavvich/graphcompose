import { checkFlow } from "../graph/check-flow.js";
import { isSelf, type Flow, type FlowNode, type FlowStep } from "../graph/flow.js";
import type { AgentExecutionOutput } from "../run/types.js";
import type { ExecutionOutput } from "./types.js";

/** Flow nodes by their key: the classes and named nodes a run's path is read back into. */
export type FlowNodesByKey = ReadonlyMap<string, FlowNode>;

const nodesOfStep = (step: FlowStep): readonly FlowNode[] => {
  switch (step.kind) {
    case "to":
      return [...step.from, ...step.targets];
    case "nextEach":
      return [...step.from, step.target];
    case "choose":
      return [...step.from, ...step.targets.filter((t): t is FlowNode => typeof t === "function" || (typeof t === "object" && t !== null && ("use" in t || "name" in t)))];
    case "chain":
      return step.nodes;
    case "join":
    case "joinAny":
    case "joinQuorum":
      return [...step.from, step.target];
  }
};

/** Every node of a flow (checked by the assembly rules) by its key. */
export function flowNodesByKey(flow: Flow): FlowNodesByKey {
  const { collected } = checkFlow(flow);
  const byKey = new Map<string, FlowNode>();
  for (const node of flow.flatMap(nodesOfStep)) {
    const key = collected.keyOf(node);
    if (key !== undefined && !byKey.has(key)) byKey.set(key, node);
  }
  return byKey;
}

/** A run of the core, as the app reports it. */
export function runResultOf(run: AgentExecutionOutput, nodes: FlowNodesByKey): ExecutionOutput {
  return {
    thread: run.threadId,
    status: run.status,
    answer: run.answer,
    route: run.route,
    stopReason: run.stopReason,
    path: run.path.flatMap((key) => {
      const node = nodes.get(key);
      return node === undefined ? [] : [node];
    }),
    spend: run.cost,
    ...(run.finish === undefined ? {} : { finish: run.finish, output: { text: run.answer } }),
    ...(run.pending === undefined ? {} : { pause: run.pending }),
    ...(run.compacted === undefined ? {} : { compacted: run.compacted }),
    ...(run.traceUrl === undefined ? {} : { traceUrl: run.traceUrl }),
  };
}
