import { agentsConfig, type AgentName } from "./config/agents.config.js";
import { resolveRouterModel, validateAgentsConfig } from "./config/types.js";
import { homedir } from "node:os";
import { join } from "node:path";
import { createFileLedger } from "./finops/ledger.js";
import type { RunDeps } from "./index.js";
import { createJevClient } from "./llm/jev-client.js";
import { createChatModel, readOpenRouterEnv } from "./llm/model.js";
import { createModelRegistry, type ModelFactory } from "./llm/registry.js";
import { agentSystemPrompts } from "./prompts/agents.js";
import { createRouter } from "./routers/index.js";

/** Daily spend ledgers live outside the repo. */
export const DEFAULT_LEDGER_DIR = join(homedir(), ".langgraph-agents", "spend");

/** Production wiring: real config, OpenRouter (chat + Jev), file spend ledger, real prompts. */
export function createAppDeps(env: NodeJS.ProcessEnv = process.env): RunDeps<AgentName> {
  const config = validateAgentsConfig(agentsConfig);
  const connection = readOpenRouterEnv(env);
  const chatModel: ModelFactory = (settings) => createChatModel(settings, connection);
  const router = createRouter(
    "main",
    resolveRouterModel(config.routers.main, config.defaults),
    config.defaults.chat,
    { chatModel, jevClient: createJevClient(connection) },
  );
  return {
    config,
    registry: createModelRegistry(config, chatModel),
    router,
    prompts: agentSystemPrompts,
    ledger: createFileLedger(env.SPEND_LEDGER_DIR ?? DEFAULT_LEDGER_DIR),
  };
}
