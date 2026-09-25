import { MemorySaver } from "@langchain/langgraph";
import { resolveTools, type AgentBundle, type BundleServices } from "./bundle.js";
import type { KnowledgeSource } from "./rag/types.js";
import { ResearchCoder } from "./bundles/research-coder/research-coder.bundle.js";
import { bundleOf } from "./components/index.js";
import { resolveRouterModel, validateAgentsConfig, type AgentsConfigOf } from "./config/types.js";
import { homedir } from "node:os";
import { join } from "node:path";
import { createFileLedger } from "./finops/ledger.js";
import type { EvalDeps } from "./eval/eval.js";
import type { RunDeps } from "./index.js";
import { configSnapshot, runVersions } from "./run/versions.js";
import { createSqliteTernStore, stableJson } from "./terns/index.js";
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
  type AnyTool,
  type TransportFactory,
} from "./tools/index.js";

export class UnknownToolError extends Error {
  override name = "UnknownToolError";
}

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

/** Core services for the bundle's components; one object, so tools and knowledge share instances. */
const servicesFor = (
  bundle: AgentBundle,
  factories: RouterFactories,
  env: NodeJS.ProcessEnv,
): BundleServices => ({
  router: (name) =>
    createRouter(name, bundle.config.defaults.router, bundle.config.defaults.chat, factories),
  env,
});

/** Context-mode knowledge bases per agent, when the bundle has any. */
function knowledgeFor(
  bundle: AgentBundle,
  services: BundleServices,
): { readonly knowledge?: (agent: string) => readonly KnowledgeSource[] } {
  const byAgent = bundle.knowledge?.(services);
  return byAgent === undefined ? {} : { knowledge: (agent) => byAgent.get(agent) ?? [] };
}

const pauseFor = (bundle: AgentBundle): AppDeps["pause"] =>
  bundle.needsApproval === undefined
    ? undefined
    : { checkpointer: new MemorySaver(), needsApproval: bundle.needsApproval };
/** One quality judge per agent with `reasoning` (Jev unless reasoning sets a model). */
const judgesFor = (
  config: AgentsConfigOf<string>,
  factories: RouterFactories,
): ReadonlyMap<string, Router> =>
  new Map(
    Object.entries(config.agents).flatMap(([name, agent]) =>
      agent.reasoning === undefined
        ? []
        : [
            [
              name,
              createRouter(
                `quality:${name}`,
                agent.reasoning.model ?? config.defaults.router,
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
  /** Startup warnings, e.g. a config changed without a version bump. */
  readonly warnings: readonly string[];
  readonly close: () => Promise<void>;
}

const mainRouter = (config: AgentsConfigOf<string>, factories: RouterFactories): Router =>
  createRouter(
    "main",
    resolveRouterModel(config.routers.main, config.defaults),
    config.defaults.chat,
    factories,
  );

/** Stores the config snapshot of this version; warns when the version already had other content. */
async function versionWarnings(deps: RunDeps<string>): Promise<string[]> {
  const { configVersion, configHash } = runVersions(deps);
  const { drift } = await deps.terns.rememberConfig(
    deps.config.name,
    configVersion,
    configHash,
    stableJson(configSnapshot(deps)),
  );
  return drift
    ? [
        `config "${deps.config.name}" ${configVersion} changed without a version bump (hash ${configHash})`,
      ]
    : [];
}

/**
 * Production wiring of a bundle (default: the project's agents): OpenRouter (chat + Jev), MCP
 * servers, file spend ledger, Tern store. Fails fast when an MCP server is unavailable or drifted.
 */
export async function createAppDeps(
  env: NodeJS.ProcessEnv = process.env,
  makeTransport?: TransportFactory,
  given?: AgentBundle,
): Promise<AppDeps> {
  const bundle = given ?? (await bundleOf(ResearchCoder));
  const connection = readOpenRouterEnv(env);
  const chatModel: ModelFactory = (settings) => createChatModel(settings, connection);
  const factories = { chatModel, jevClient: createJevClient(connection) };
  const services = servicesFor(bundle, factories, env);
  const tools: readonly AnyTool[] = resolveTools(bundle, services);
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
  const router = mainRouter(config, factories);
  const terns = createSqliteTernStore(env.TERN_DB ?? DEFAULT_TERN_DB);
  const tracing = langfuseTracing(env);
  const ledger = createFileLedger(env.SPEND_LEDGER_DIR ?? DEFAULT_LEDGER_DIR);
  const deps = {
    config,
    registry: createModelRegistry(config, chatModel),
    router,
    prompts: bundle.prompts,
    guards: guardsFor(config, factories),
    judges: judgesFor(config, factories),
    tools: toolLookup(tools),
    pause: pauseFor(bundle),
    compactionPrompt: bundle.compactionPrompt,
    ...knowledgeFor(bundle, services),
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
  return { ...deps, warnings: await versionWarnings(deps) };
}
