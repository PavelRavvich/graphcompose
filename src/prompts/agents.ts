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

/** Final message of an agent whose loop was stopped by the run budget. */
export const BUDGET_STOP_MESSAGE = "stopped: run budget exhausted";
