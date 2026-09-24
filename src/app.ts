import { agentsConfig, type AgentName } from "./config/agents.config.js";
import { resolveRouterModel, validateAgentsConfig, type AgentsConfigOf } from "./config/types.js";
import { homedir } from "node:os";
import { join } from "node:path";
import { createFileLedger } from "./finops/ledger.js";
import type { EvalDeps } from "./eval/eval.js";
import type { RunDeps } from "./index.js";
import { createSqliteTernStore } from "./terns/index.js";
import { createJevClient } from "./llm/jev-client.js";
import { createChatModel, readOpenRouterEnv } from "./llm/model.js";
import { createModelRegistry, type ModelFactory } from "./llm/registry.js";
import { buildGuards, type GuardSet } from "./guards/index.js";
import { agentSystemPrompts } from "./prompts/agents.js";
import { guardPrompts } from "./prompts/guards.js";
import { createRouter, type RouterFactories } from "./routers/index.js";
import {
  connectMcpServers,
  mcpFacades,
  mcpServerHandles,
  toolRegistry,
  type TransportFactory,
} from "./tools/index.js";

const mcpServersOf = (config: AgentsConfigOf<string>): AgentsConfigOf<string>["mcpServers"] =>
  config.mcpServers;
/** Guards from config + their texts; each guard is a router (Jev unless it sets a model). */
const guardsFor = (config: AgentsConfigOf<string>, factories: RouterFactories): GuardSet =>
  buildGuards(config.guards, guardPrompts, (name, model) =>
    createRouter(`guard:${name}`, model ?? config.defaults.router, config.defaults.chat, factories),
  );

/** Daily spend ledgers live outside the repo. */
export const DEFAULT_LEDGER_DIR = join(homedir(), ".langgraph-agents", "spend");

/** Terns (runs, threads, scores) live outside the repo. */
export const DEFAULT_TERN_DB = join(homedir(), ".langgraph-agents", "terns.sqlite");

/** Run dependencies, eval dependencies, and resources to release after the run. */
export interface AppDeps extends RunDeps<AgentName> {
  readonly evaluation: EvalDeps;
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
  const factories = { chatModel, jevClient: createJevClient(connection) };
  const router = createRouter(
    "main",
    resolveRouterModel(config.routers.main, config.defaults),
    config.defaults.chat,
    factories,
  );
  const terns = createSqliteTernStore(env.TERN_DB ?? DEFAULT_TERN_DB);
  const ledger = createFileLedger(env.SPEND_LEDGER_DIR ?? DEFAULT_LEDGER_DIR);
  return {
    config,
    registry: createModelRegistry(config, chatModel),
    router,
    prompts: agentSystemPrompts,
    guards: guardsFor(config, factories),
    tools: (name) => toolRegistry.get(name as never),
    ledger,
    terns,
    evaluation: {
      terns,
      ledger,
      judge: createRouter("judge", config.defaults.router, config.defaults.chat, factories),
      account: { key: `${config.name}:eval`, dailyCap: config.budget.evalBudgetCap },
    },
    close: async () => {
      await mcp.close();
      terns.close();
    },
  };
}
