import type { ToolName } from "../tools/index.js";
import { MODEL_MAX, type AgentsConfigOf } from "./types.js";

const KIMI_PRICE = { inputPerMTok: 0.4972, outputPerMTok: 2.97, cacheReadPerMTok: 0.1284 };

/**
 * Agents, routers, models and budget — everything tunable lives here.
 * - Add an agent: one entry in `agents` + one prompt in src/prompts/agents.ts (compiler-enforced).
 * - Routers use `defaults.router` (Jev) unless they set their own `model`.
 * - Prices: USD per 1M tokens, verify on openrouter.ai/models. Jev cost comes from its API.
 */
export const agentsConfig = {
  name: "research-coder",
  defaults: {
    chat: { temperature: 0, maxTokens: MODEL_MAX, thinking: "default", cache: true },
    router: { kind: "jev", model: "typesafe/jev-1.13" },
    tools: { maxToolCalls: 8 },
  },
  budget: { runBudgetCap: 0.05, dailyBudgetCap: 2, evalBudgetCap: 1 },
  routers: {
    main: { maxHops: 3 },
    // Override example — LLM router instead of Jev:
    // main: {
    //   maxHops: 3,
    //   model: { kind: "llm", model: "moonshotai/kimi-k2.6", maxTokens: 200, price: KIMI_PRICE },
    // },
  },
  // MCP servers used by facades in src/tools/catalog.ts. Only env variable NAMES, never secrets:
  // mcpServers: {
  //   github: { transport: "stdio", command: "github-mcp-server", args: ["stdio"], env: ["GITHUB_PERSONAL_ACCESS_TOKEN"] },
  // },
  agents: {
    researcher: {
      model: "moonshotai/kimi-k2.6",
      description: "Finds, explains and summarizes facts",
      tools: ["current_time"],
      price: KIMI_PRICE,
    },
    coder: {
      model: "moonshotai/kimi-k2.6",
      description: "Writes, reviews and explains code",
      temperature: 0.2,
      thinking: "low",
      price: KIMI_PRICE,
    },
  },
} as const satisfies AgentsConfigOf<string, ToolName>;

export type AgentName = keyof typeof agentsConfig.agents;
