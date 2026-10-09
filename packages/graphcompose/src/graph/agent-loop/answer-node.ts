import type { AsyncNode } from "../types.js";
import type { AgentLoopDeps } from "./deps.js";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { JudgeOwner, JudgePoint, visitAgentAnswer, mergePolicies } from "./judge-points.js";
import type { AgentLoopStateType, AgentLoopUpdate } from "./state.js";

/** A move without tool calls is the agent's replyWith: `beforeAgentAnswer`, then it leaves the loop. */
export function makeAnswerNode(
  deps: AgentLoopDeps,
): AsyncNode<AgentLoopStateType, AgentLoopUpdate> {
  const agent = deps.agent.name;
  // eslint-disable-next-line complexity
  return async (state, config) => {
    const combinedGuardrails = mergePolicies(deps.workflowGuardrails, deps.guardrails);
    const ctx = {
      agent,
      replyWith:
        typeof state.move?.content === "string" ? state.move.content : (state.move?.text ?? ""),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      runId: config?.configurable?.run_id ?? state.runId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      metadata: config?.configurable?.metadata ?? {},
    };
    const appState = { runId: state.runId, threadId: state.runId, activeNode: deps.agent.name };
    await visitAgentAnswer(combinedGuardrails, ctx, deps.observer, appState);
    const content = state.move?.content ?? "";
    const isString = typeof content === "string";
    const textReply = isString ? content.trim() : (state.move?.text.trim() ?? "");
    const trimmedContent = isString ? content.trim() : content;
    return {
      messages: state.move === null ? [] : [state.move],
      move: null,
      reply: textReply,
      contributions: [{ agent, content: trimmedContent }],
    };
  };
}
