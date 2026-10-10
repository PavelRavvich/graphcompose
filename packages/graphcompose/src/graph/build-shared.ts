import { END, type StateGraph } from "@langchain/langgraph";
import type { FlowModel } from "./check-flow.js";
import type { FlowNodeRef } from "./flow-nodes.js";
import type { FlowState, FlowStateType, FlowStateUpdate } from "./flow-state.js";

/** The LangGraph builder of a flow graph. */
export type Builder = StateGraph<typeof FlowState.spec, FlowStateType, FlowStateUpdate, string>;

/**
 * The LangGraph node of a flow node: `<kind>.<name>` (e.g. `workflow-finish.chat`) — flow names may
 * equal state keys (`replyWith`), which LangGraph does not allow as node names.
 */
export const graphNodeId = (node: Pick<FlowNodeRef, "kind" | "name">): string =>
  `${node.kind}.${node.name}`;

/** A node of a checked flow by key (every transition target is a node once the rules pass). */
export function nodeKeyed(model: FlowModel, key: string): FlowNodeRef {
  const ref = model.nodes.get(key);
  if (ref === undefined) throw new Error(`Flow node "${key}" is missing after the rules passed`);
  return ref;
}

/** Node key → graph node id, for the given keys (a conditional edge's path map). */
export const pathMap = (model: FlowModel, keys: readonly string[]): Record<string, string> =>
  Object.fromEntries(
    keys.map((key) => {
      if (key === "skip-wrap") return ["skip-wrap", "skip-wrap"];
      if (key === END) return [END, END];
      return [key, graphNodeId(nodeKeyed(model, key))];
    }),
  );
