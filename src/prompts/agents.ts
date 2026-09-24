import type { AgentName } from "../config/agents.config.js";
import type { AgentPrompts } from "../config/types.js";

/** One system prompt per agent in agents.config.ts — the type makes a missing one a compile error. */
export const agentSystemPrompts: AgentPrompts<AgentName> = {
  researcher:
    "You are a research specialist. Answer with verified facts, concisely. Say when unsure.",
  coder:
    "You are a senior TypeScript engineer. Give working, typed code with a one-line explanation.",
};

/** The agent's user message: the task and what other agents already contributed. */
export const renderAgentInput = (task: string, contributions: string, history = ""): string =>
  `${history}Task:\n${task}\n\nPrevious contributions:\n${contributions}`;

/** Review: asked to the review router after an agent answers. */
export const REVIEW_QUESTION = "Does this answer need another pass to be correct and complete?";
export const REVISE_OPTION = "The answer is wrong, incomplete or unclear and should be improved.";
export const ACCEPT_OPTION = "The answer is correct and complete as it is.";
export const REVISE_INSTRUCTION =
  "Improve your previous answer: fix mistakes, fill gaps, keep what is right. Reply with the full improved answer.";

/** Review texts — part of the prompt version. */
export const reviewPromptTexts: readonly string[] = [
  REVIEW_QUESTION,
  REVISE_OPTION,
  ACCEPT_OPTION,
  REVISE_INSTRUCTION,
];

/** Final message of an agent whose loop was stopped by the run budget. */
export const BUDGET_STOP_MESSAGE = "stopped: run budget exhausted";
