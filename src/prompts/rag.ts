import type { Passage } from "../rag/types.js";

/** Asked of the model in both modes. Part of the prompt version. */
export const CITE_INSTRUCTION =
  "Answer from these passages when they are relevant and cite each fact's source as [source]. Say when they do not cover the question.";

/** Suffix of a knowledge base's search tool description. */
export const SEARCH_TOOL_SUFFIX =
  "Returns the most relevant passages with their source; cite them as [source].";

/** Context mode: passages put before the task. */
export const knowledgeBlock = (name: string, passages: readonly Passage[]): string =>
  `Knowledge (${name}):\n${passages.map((p) => `[${p.source}] ${p.text}`).join("\n\n")}`;

export const ragPromptTexts: readonly string[] = [
  CITE_INSTRUCTION,
  SEARCH_TOOL_SUFFIX,
  knowledgeBlock("", []),
];
