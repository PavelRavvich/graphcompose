import type { AgentStateType } from "../state.js";

export const NO_ANSWER = "No agent produced an answer.";

/** The answer of a workflow finish: the latest contribution. */
export const lastAnswer = (state: Pick<AgentStateType, "contributions">): string =>
  state.contributions.at(-1)?.content ?? NO_ANSWER;
