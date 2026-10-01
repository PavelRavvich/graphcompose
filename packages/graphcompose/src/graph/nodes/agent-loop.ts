import { END, START, StateGraph } from "@langchain/langgraph";
import type { FlowStateType, FlowStateUpdate } from "../flow-state.js";
import type { InvokableGraph } from "../subgraph-node.js";
import { AgentState, type AgentStateType } from "../state.js";
import type { FlowNodeRunner } from "../visit.js";
import { makeAgentNode, type AgentNodeDeps } from "./agent.js";
import { makeApprovalNode, type ApprovalNodeDeps } from "./approval.js";

/** The compiled agent loop, as far as its flow node needs it. */
export type AgentLoopGraph = InvokableGraph<AgentStateType, AgentStateType>;

const AGENT = "agent";
const APPROVAL = "approval";

/** After the agent: a tool call waiting for a human goes to approval, otherwise the loop ends. */
export const afterAgent = (state: Pick<AgentStateType, "pending">): typeof APPROVAL | typeof END =>
  state.pending === null ? END : APPROVAL;

/**
 * An agent's turn as a compiled subgraph: agent → (approval → agent)* → end. Inside a flow node it
 * runs with the run's checkpointer, so the approval's `interrupt()` pauses the whole run and the
 * model calls made before the pause are not repeated on resume.
 */
export function agentLoopGraph(agent: AgentNodeDeps, approval: ApprovalNodeDeps): AgentLoopGraph {
  return new StateGraph(AgentState)
    .addNode(AGENT, makeAgentNode(agent))
    .addNode(APPROVAL, makeApprovalNode(approval))
    .addEdge(START, AGENT)
    .addConditionalEdges(AGENT, afterAgent, [APPROVAL, END])
    .addEdge(APPROVAL, AGENT)
    .compile();
}

/** The agent state of a flow state, with `next` naming the agent that runs. */
export function agentInputOf(state: FlowStateType, agent: string): AgentStateType {
  return {
    task: state.task,
    history: state.history,
    runId: state.runId,
    next: agent,
    routeReason: state.routeReason,
    contributions: state.contributions,
    budgetUsd: state.budgetUsd,
    usage: state.usage,
    answer: state.answer,
    pending: state.pending,
    summaries: state.summaries,
    attempts: state.attempts,
    approvals: state.approvals,
    guarded: state.guarded,
  };
}

/** What the loop added to the appended lists (contributions, usage, attempts, approvals). */
export const loopUpdate = (before: AgentStateType, after: AgentStateType): FlowStateUpdate => ({
  contributions: after.contributions.slice(before.contributions.length),
  usage: after.usage.slice(before.usage.length),
  attempts: after.attempts.slice(before.attempts.length),
  approvals: after.approvals.slice(before.approvals.length),
  pending: after.pending,
});

/** The flow node of one agent: its loop as a subgraph, its additions merged back into the flow state. */
export const agentRunner =
  (loop: AgentLoopGraph, agent: string): FlowNodeRunner =>
  async (state, config) => {
    const before = agentInputOf(state, agent);
    return loopUpdate(before, await loop.invoke(before, config));
  };
