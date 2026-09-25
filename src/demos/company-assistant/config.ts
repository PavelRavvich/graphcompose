import { agentsConfig } from "../../config/agents.config.js";
import type { AgentsConfigOf } from "../../config/types.js";
import { DOCS_DIR, FILESYSTEM_SERVER } from "./paths.js";
import type { DemoToolName } from "./tools.js";

const { price } = agentsConfig.agents.researcher;

/** company-assistant: a new joiner's helper at Nimbus Labs — three agents, a bit of everything. */
export const assistantConfig = {
  name: "company-assistant",
  version: "1.0.0",
  defaults: agentsConfig.defaults,
  budget: agentsConfig.budget,
  routers: agentsConfig.routers,
  guards: agentsConfig.guards,
  compaction: {
    every: 5,
    keep: 10,
    model: { model: "moonshotai/kimi-k2.6", thinking: "none", price },
  },
  mcpServers: {
    docs: { transport: "stdio", command: FILESYSTEM_SERVER, args: [DOCS_DIR] },
  },
  agents: {
    researcher: {
      model: "moonshotai/kimi-k2.6",
      description: "Answers from the company docs, the current time and live exchange rates",
      tools: ["docs__list_directory", "docs__read_text_file", "current_time", "exchange_rate"],
      price,
    },
    notes: {
      model: "moonshotai/kimi-k2.6",
      description: "Saves and finds the user's personal notes and reminders",
      tools: ["note_search", "note_save"],
      price,
    },
    coder: agentsConfig.agents.coder,
  },
} as const satisfies AgentsConfigOf<string, DemoToolName>;

/** company-assistant-approval: the same agents; writing a note waits for a human (pause seam). */
export const approvalConfig = {
  ...assistantConfig,
  name: "company-assistant-approval",
} as const satisfies AgentsConfigOf<string, DemoToolName>;

export type DemoAgentName = keyof typeof assistantConfig.agents;
