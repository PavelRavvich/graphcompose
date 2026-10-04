import type { AsyncNode } from "../types.js";
import type { AgentLoopDeps } from "./deps.js";
import { JudgeOwner, JudgePoint } from "./judge-points.js";
import type { AgentLoopStateType, AgentLoopUpdate } from "./state.js";

/** A move without tool calls is the agent's answer: `beforeAgentAnswer`, then it leaves the loop. */
export function makeAnswerNode(
  deps: AgentLoopDeps,
): AsyncNode<AgentLoopStateType, AgentLoopUpdate> {
  const agent = deps.agent.name;
  return async (state) => {
    await deps.judges({ point: JudgePoint.BeforeAgentAnswer, owner: JudgeOwner.Agent, agent });
    const content = state.move?.content ?? "";
    const textReply =
      typeof content === "string" ? content.trim() : (state.move?.text.trim() ?? "");
    const trimmedContent = typeof content === "string" ? content.trim() : content;
    return {
      messages: state.move === null ? [] : [state.move],
      move: null,
      reply: textReply,
      contributions: [{ agent, content: trimmedContent }],
    };
  };
}
