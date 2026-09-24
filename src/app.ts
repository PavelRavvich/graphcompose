import { agentsConfig, type AgentName } from "./config/agents.config.js";
import { resolveRouterModel, validateAgentsConfig, type AgentsConfigOf } from "./config/types.js";
import { homedir } from "node:os";
import { join } from "node:path";
import { createFileLedger } from "./finops/ledger.js";
import type { RunDeps } from "./index.js";
import { createJevClient } from "./llm/jev-client.js";
import { createChatModel, readOpenRouterEnv } from "./llm/model.js";
import { createModelRegistry, type ModelFactory } from "./llm/registry.js";
import { agentSystemPrompts } from "./prompts/agents.js";
import { createRouter } from "./routers/index.js";
import {
  connectMcpServers,
  mcpFacades,
  mcpServerHandles,
  toolRegistry,
  type TransportFactory,
} from "./tools/index.js";

const mcpServersOf = (config: AgentsConfigOf<string>): AgentsConfigOf<string>["mcpServers"] =>
  config.mcpServers;

/** Daily spend ledgers live outside the repo. */
export const DEFAULT_LEDGER_DIR = join(homedir(), ".langgraph-agents", "spend");

/** Run dependencies plus resources to release after the run (MCP connections). */
export interface AppDeps extends RunDeps<AgentName> {
  readonly close: () => Promise<void>;
}

/**
 * Production wiring: real config, OpenRouter (chat + Jev), MCP servers, file spend ledger, prompts.
 * Fails fast when an MCP server is unavailable or its contract drifted.
 */
export async function createAppDeps(
  env: NodeJS.ProcessEnv = process.env,
  makeTransport?: TransportFactory,
): Promise<AppDeps> {
  const config = validateAgentsConfig(agentsConfig, toolRegistry.names);
  const mcp = await connectMcpServers(
    mcpServersOf(config),
    mcpServerHandles,
    mcpFacades(),
    env,
    makeTransport,
  );
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
    tools: (name) => toolRegistry.get(name as never),
    ledger: createFileLedger(env.SPEND_LEDGER_DIR ?? DEFAULT_LEDGER_DIR),
    close: mcp.close,
  };
}
