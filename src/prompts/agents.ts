import { ChatPromptTemplate } from "@langchain/core/prompts";
import type { AgentName } from "../config/agents.config.js";
import type { AgentPrompts } from "../config/types.js";

/** One system prompt per agent in agents.config.ts — the type makes a missing one a compile error. */
export const agentSystemPrompts: AgentPrompts<AgentName> = {
  researcher:
    "You are a research specialist. Answer with verified facts, concisely. Say when unsure.",
  coder:
    "You are a senior TypeScript engineer. Give working, typed code with a one-line explanation.",
};

export const agentPrompt = ChatPromptTemplate.fromMessages([
  ["system", "{system}"],
  ["human", "Task:\n{task}\n\nPrevious contributions:\n{contributions}"],
]);
