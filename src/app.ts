import { MemorySaver } from "@langchain/langgraph";
import { defaultBundle, resolveTools, type AgentBundle } from "./bundle.js";
import { resolveRouterModel, validateAgentsConfig, type AgentsConfigOf } from "./config/types.js";
import { homedir } from "node:os";
import { join } from "node:path";
import { createFileLedger } from "./finops/ledger.js";
import type { EvalDeps } from "./eval/eval.js";
import type { RunDeps } from "./index.js";
import { createSqliteTernStore } from "./terns/index.js";
import { langfuseTracing } from "./tracing/index.js";
import { createJevClient } from "./llm/jev-client.js";
import { createChatModel, readOpenRouterEnv } from "./llm/model.js";
import { createModelRegistry, type ModelFactory } from "./llm/registry.js";
import { buildGuards, type GuardSet } from "./guards/index.js";
import { guardPrompts } from "./prompts/guards.js";
import { createRouter, type Router, type RouterFactories } from "./routers/index.js";
import {
  connectMcpServers,
  isMcpFacade,
  UnknownToolError,
  type AnyTool,
  type TransportFactory,
} from "./tools/index.js";

/** Tool lookup for the graph; an unknown name is a wiring bug. */
const toolLookup = (tools: readonly AnyTool[]): ((name: string) => AnyTool) => {
  const byName = new Map(tools.map((tool) => [tool.name, tool] as const));
  return (name) => {
    const tool = byName.get(name);
    if (tool === undefined) throw new UnknownToolError(`Unknown tool "${name}"`);
    return tool;
  };
};

/** Eval / replay: a Jev judge, spend on `<bundle>:eval` within evalBudgetCap. */
const evaluationFor = (
  config: AgentsConfigOf<string>,
  stores: Pick<EvalDeps, "terns" | "ledger">,
  factories: RouterFactories,
): EvalDeps => ({
  ...stores,
  judge: createRouter("judge", config.defaults.router, config.defaults.chat, factories),
  account: { key: `${config.name}:eval`, dailyCap: config.budget.evalBudgetCap },
});

/** Bundle tools; factories get a router on the bundle's default router model (Jev). */
const toolsFor = (bundle: AgentBundle, factories: RouterFactories): readonly AnyTool[] =>
  resolveTools(bundle, {
    router: (name) =>
      createRouter(name, bundle.config.defaults.router, bundle.config.defaults.chat, factories),
  });

const pauseFor = (bundle: AgentBundle): AppDeps["pause"] =>
  bundle.needsApproval === undefined
    ? undefined
    : { checkpointer: new MemorySaver(), needsApproval: bundle.needsApproval };
/** One review router per agent with `review` (Jev unless the review sets a model). */
const reviewersFor = (
  config: AgentsConfigOf<string>,
  factories: RouterFactories,
): ReadonlyMap<string, Router> =>
  new Map(
    Object.entries(config.agents).flatMap(([name, agent]) =>
      agent.review === undefined
        ? []
        : [
            [
              name,
              createRouter(
                `review:${name}`,
                agent.review.model ?? config.defaults.router,
                config.defaults.chat,
                factories,
              ),
            ] as const,
          ],
    ),
  );

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
export interface AppDeps extends RunDeps<string> {
  readonly evaluation: EvalDeps;
  readonly close: () => Promise<void>;
}

/**
 * Production wiring of a bundle (default: the project's agents): OpenRouter (chat + Jev), MCP
 * servers, file spend ledger, Tern store. Fails fast when an MCP server is unavailable or drifted.
 */
export async function createAppDeps(
  env: NodeJS.ProcessEnv = process.env,
  makeTransport?: TransportFactory,
  bundle: AgentBundle = defaultBundle,
): Promise<AppDeps> {
  const connection = readOpenRouterEnv(env);
  const chatModel: ModelFactory = (settings) => createChatModel(settings, connection);
  const factories = { chatModel, jevClient: createJevClient(connection) };
  const tools = toolsFor(bundle, factories);
  const config = validateAgentsConfig(
    bundle.config,
    tools.map((tool) => tool.name),
  );
  const mcp = await connectMcpServers(
    config.mcpServers,
    bundle.mcpServers,
    tools.filter(isMcpFacade),
    env,
    makeTransport,
  );
  const router = createRouter(
    "main",
    resolveRouterModel(config.routers.main, config.defaults),
    config.defaults.chat,
    factories,
  );
  const terns = createSqliteTernStore(env.TERN_DB ?? DEFAULT_TERN_DB);
  const tracing = langfuseTracing(env);
  const ledger = createFileLedger(env.SPEND_LEDGER_DIR ?? DEFAULT_LEDGER_DIR);
  return {
    config,
    registry: createModelRegistry(config, chatModel),
    router,
    prompts: bundle.prompts,
    guards: guardsFor(config, factories),
    reviewers: reviewersFor(config, factories),
    tools: toolLookup(tools),
    pause: pauseFor(bundle),
    ledger,
    terns,
    evaluation: evaluationFor(config, { terns, ledger }, factories),
    tracing,
    close: async () => {
      await mcp.close();
      await tracing?.shutdown();
      terns.close();
    },
  };
}
