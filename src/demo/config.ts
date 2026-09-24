import { agentsConfig } from "../config/agents.config.js";
import type { AgentsConfigOf } from "../config/types.js";
import { DOCS_DIR, FILESYSTEM_SERVER } from "./paths.js";
import type { DemoToolName } from "./tools.js";

const { price } = agentsConfig.agents.researcher;

/** Demo "assistant": three agents with a bit of everything. Core defaults, guards and budget. */
export const assistantConfig = {
  name: "demo-assistant",
  defaults: agentsConfig.defaults,
  budget: agentsConfig.budget,
  routers: agentsConfig.routers,
  guards: agentsConfig.guards,
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

/** Demo "approval": the same agents; writing a note waits for a human (pause seam). */
export const approvalConfig = {
  ...assistantConfig,
  name: "demo-approval",
} as const satisfies AgentsConfigOf<string, DemoToolName>;

export type DemoAgentName = keyof typeof assistantConfig.agents;
