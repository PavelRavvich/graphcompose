import { END, START, StateGraph } from "@langchain/langgraph";
import { makeAnswerNode } from "./answer-node.js";
import { makeApprovalNode } from "./approval-node.js";
import { makeBoundaryNode, routeToActions } from "./boundary.js";
import { makeCollectNode } from "./collect-node.js";
import { callsOf } from "./deps.js";
import { makeInputNode } from "./input-node.js";
import { makeModelNode } from "./model-node.js";
import { AgentLoopState, LOOP_NODE } from "./state.js";
import { makeToolNode } from "./tools-node.js";
/** After a model turn: the loop already ended (budget), tool calls go to the boundary, else the replyWith. */
export const afterModel = (state) => {
  if (state.reply !== null) return END;
  return callsOf(state.move).length > 0 ? LOOP_NODE.boundary : LOOP_NODE.replyWith;
};
const ACTIONS = [LOOP_NODE.approval, LOOP_NODE.tool, LOOP_NODE.collect];
function createLoopGraph(deps, checkpointer) {
  return new StateGraph(AgentLoopState)
    .addNode(LOOP_NODE.input, makeInputNode(deps))
    .addNode(LOOP_NODE.model, makeModelNode(deps))
    .addNode(LOOP_NODE.boundary, makeBoundaryNode(deps))
    .addNode(LOOP_NODE.approval, makeApprovalNode(deps))
    .addNode(LOOP_NODE.tool, makeToolNode(deps))
    .addNode(LOOP_NODE.collect, makeCollectNode(deps))
    .addNode(LOOP_NODE.replyWith, makeAnswerNode(deps))
    .addEdge(START, LOOP_NODE.input)
    .addEdge(LOOP_NODE.input, LOOP_NODE.model)
    .addConditionalEdges(LOOP_NODE.model, afterModel, [
      LOOP_NODE.boundary,
      LOOP_NODE.replyWith,
      END,
    ])
    .addConditionalEdges(LOOP_NODE.boundary, routeToActions(deps), ACTIONS)
    .addConditionalEdges(LOOP_NODE.approval, routeToActions(deps), ACTIONS)
    .addEdge(LOOP_NODE.tool, LOOP_NODE.collect)
    .addEdge(LOOP_NODE.collect, LOOP_NODE.model)
    .addEdge(LOOP_NODE.replyWith, END)
    .compile(checkpointer === undefined ? {} : { checkpointer });
}
/**
 * One agent's own loop as a compiled subgraph: input → model → boundary → (approval ⟲) → tool × N
 * (`Send`) → collect → model … → replyWith. Added as one node of the workflow graph, it checkpoints
 * through the run's checkpointer (a checkpointer given here makes it a graph of its own, as in tests).
 */
export function agentLoopGraph(deps, checkpointer) {
  return createLoopGraph(deps, checkpointer);
}
