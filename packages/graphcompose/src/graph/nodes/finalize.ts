import type { AgentStateType, AgentStateUpdate } from "../state.js";
import type { SyncNode } from "../types.js";

export const NO_ANSWER = "No agent produced an answer.";

/** The answer is the latest contribution. */
export const finalize: SyncNode<AgentStateType, AgentStateUpdate> = (state) => ({
  answer: state.contributions.at(-1)?.content ?? NO_ANSWER,
});
