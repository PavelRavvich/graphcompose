import { ChatPromptTemplate } from "@langchain/core/prompts";

/** Jev question text. Options arrive as criteria. */
export const jevRouteInstructions =
  "Which option should handle this next? Pick the option whose description fits the input best.";

/** LLM router prompt. */
export const llmRouterPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    [
      "You are a router. Pick exactly one option for the input.",
      "Options:",
      "{options}",
      "",
      'Reply with JSON only: {{"next": "<option name>", "reason": "<short reason>"}}.',
    ].join("\n"),
  ],
  ["human", "{input}"],
]);
