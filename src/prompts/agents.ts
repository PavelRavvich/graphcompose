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

/** Reasoning: the judge scores each attempt; criteria give feedback for the next one. */
export const QUALITY_QUESTION = "Is this answer good enough for the task?";
export const GOOD_OPTION = "Correct, complete and directly usable for the task.";
export const NOT_GOOD_OPTION = "Wrong, incomplete, unclear or not directly usable.";
export const DEFAULT_CRITERIA: readonly string[] = [
  "The answer is correct.",
  "The answer fully addresses the task.",
  "The answer is clear and directly usable.",
];
export const MEETS_OPTION = "The answer meets it.";
export const MISSES_OPTION = "The answer does not meet it.";
export const criterionQuestion = (criterion: string): string =>
  `Does the answer meet this criterion: ${criterion}`;
export const IMPROVE_INSTRUCTION =
  "Improve your previous answer: fix what the reviewer flagged, keep what is right. Reply with the full improved answer.";

/** Reasoning texts — part of the prompt version. */
export const reasoningPromptTexts: readonly string[] = [
  QUALITY_QUESTION,
  GOOD_OPTION,
  NOT_GOOD_OPTION,
  ...DEFAULT_CRITERIA,
  criterionQuestion(""),
  MEETS_OPTION,
  MISSES_OPTION,
  IMPROVE_INSTRUCTION,
];

/** Tool result shown to the model while a human decides; the loop then stops. */
export const PENDING_APPROVAL_MESSAGE = "Waiting for human approval of this tool call.";
export const PAUSED_MESSAGE = "paused: waiting for human approval";

/** What the model reads when a human rejected a call. */
export const rejectionMessage = (note: string | undefined): string =>
  `Tool error: rejected by human${note === undefined ? "" : `: ${note}`}`;

/** Final message of an agent whose loop was stopped by the run budget. */
export const BUDGET_STOP_MESSAGE = "stopped: run budget exhausted";
