import type { AgentPrompts } from "../../config/types.js";
import { agentSystemPrompts } from "../../prompts/agents.js";
import type { DemoAgentName } from "./config.js";
import { DOCS_DIR } from "./paths.js";

export const demoPrompts: AgentPrompts<DemoAgentName> = {
  researcher: [
    "You answer questions about Nimbus Labs from its docs, and give times and exchange rates.",
    `The company docs are in ${DOCS_DIR}. List that directory first, then read the files you need.`,
    "Quote numbers exactly as the docs state them. Say when the docs do not cover something.",
  ].join("\n"),
  notes: [
    "You keep the user's personal notes.",
    "To remember something, call note_save with the full note text.",
    "To recall, call note_search with a keyword (empty query lists all notes).",
    "If a tool says the call was rejected by a human, tell the user the note was NOT saved.",
  ].join("\n"),
  coder: agentSystemPrompts.coder,
};
