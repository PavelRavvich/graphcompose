import { MODEL_MAX, type AgentsConfig } from "./types.js";

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
  },
  budget: { runBudgetCap: 0.05, dailyBudgetCap: 2 },
  routers: {
    main: { maxHops: 3 },
    // Override example — LLM router instead of Jev:
    // main: {
    //   maxHops: 3,
    //   model: { kind: "llm", model: "moonshotai/kimi-k2.6", maxTokens: 200, price: KIMI_PRICE },
    // },
  },
  agents: {
    researcher: {
      model: "moonshotai/kimi-k2.6",
      description: "Finds, explains and summarizes facts",
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
} as const satisfies AgentsConfig;

export type AgentName = keyof typeof agentsConfig.agents;
