import { ToolMessage } from "@langchain/core/messages";
import type { ApprovalRecord } from "../../pause/index.js";
import { rejectionMessage } from "../../prompts/agents.js";
import type { AsyncNode } from "../types.js";
import { callsOf, toolNamed, type AgentLoopDeps, type LoopCall } from "./deps.js";
import { JudgePoint, visitToolThenAgent } from "./judge-points.js";
import type { AgentLoopStateType, AgentLoopUpdate } from "./state.js";

/** What the model reads for a call: its stored result, or who rejected it and why. */
function contentOf(state: AgentLoopStateType, call: LoopCall): string {
  const stored = state.results[call.callId];
  if (stored !== undefined) return stored.content;
  const decision = state.decisions[call.callId];
  return rejectionMessage(decision?.by ?? "the loop", decision?.reason);
}

/** The decided calls of this move, as the flow keeps them (#100: the turn ends after a decision). */
function decidedCalls(
  state: AgentLoopStateType,
  calls: readonly LoopCall[],
  agent: string,
): ApprovalRecord[] {
  return calls.flatMap((call) => {
    const decision = state.decisions[call.callId];
    if (decision === undefined) return [];
    const result = contentOf(state, call);
    return [
      {
        agent,
        tool: call.tool,
        args: call.args,
        approved: decision.approved,
        by: decision.by,
        result,
      },
    ];
  });
}

/**
 * Fan-in after the tool tasks: one tool message per call in the MOVE's order (not completion
 * order), the `afterToolCall` points for every call that ran, the decisions recorded; then the
 * model takes its next turn.
 */
export function makeCollectNode(
  deps: AgentLoopDeps,
): AsyncNode<AgentLoopStateType, AgentLoopUpdate> {
  return async (state) => {
    const calls = callsOf(state.move);
    for (const call of calls) {
      const ran =
        state.results[call.callId] !== undefined && toolNamed(deps.agent, call.tool) !== undefined;
      if (!ran) continue;
      await visitToolThenAgent(deps.judges, JudgePoint.AfterToolCall, deps.agent.name, call);
    }
    const messages = calls.map(
      (call) => new ToolMessage({ tool_call_id: call.callId, content: contentOf(state, call) }),
    );
    return { messages, move: null, approvals: decidedCalls(state, calls, deps.agent.name) };
  };
}
