import { MemorySaver } from "@langchain/langgraph";
import { resolveTools, type AssembledWorkflow, type WorkflowServices } from "./workflow.js";
import type { KnowledgeSource } from "./rag/types.js";
import { validateAgentsConfig, type AgentsConfigOf } from "./config/types.js";
import { chatModelSettingsOf, flowRouterFactory } from "./graph/router-model.js";
import { homedir } from "node:os";
import { join } from "node:path";
import { createFileLedger } from "./finops/ledger.js";
import type { EvalDeps } from "./eval/eval.js";
import type { RunDeps } from "./index.js";
import { configSnapshot, runVersions } from "./run/versions.js";
import { createSqliteTernStore, shortVersion, stableJson } from "./terns/index.js";
import { langfuseTracing } from "./tracing/index.js";
import { createOpenRouterGateway, type ModelGateway } from "./llm/gateway.js";
import { createModelRegistry } from "./llm/registry.js";
import { buildGuards, type GuardSet } from "./guards/index.js";
import { guardPrompts } from "./prompts/guards.js";
import { createRouter, type Router } from "./routers/index.js";
import { connectMcpServers, type AnyTool, type TransportFactory } from "./tools/index.js";

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

/** Eval / replay: a Jev judge, spend on `<workflow>:eval` — its own day, capped like the workflow's. */
const evaluationFor = (
  bundle: AssembledWorkflow,
  stores: Pick<EvalDeps, "terns" | "ledger">,
  gateway: ModelGateway,
): EvalDeps => ({
  ...stores,
  judge: createRouter("judge", bundle.config.defaults.router, bundle.config.defaults.chat, gateway),
  account: {
    key: `${bundle.config.name}:eval`,
    dailyCap: bundle.limits.perDay?.cost ?? Number.POSITIVE_INFINITY,
  },
});

/** Core services for the workflow's components; one object, so tools and knowledge share instances. */
const servicesFor = (
  bundle: AssembledWorkflow,
  gateway: ModelGateway,
  env: NodeJS.ProcessEnv,
): WorkflowServices => ({
  router: (name) =>
    createRouter(name, bundle.config.defaults.router, bundle.config.defaults.chat, gateway),
  env,
});

/** Context-mode knowledge bases per agent, when the workflow has any. */
function knowledgeFor(
  bundle: AssembledWorkflow,
  services: WorkflowServices,
): { readonly knowledge?: (agent: string) => readonly KnowledgeSource[] } {
  const byAgent = bundle.knowledge?.(services);
  return byAgent === undefined ? {} : { knowledge: (agent) => byAgent.get(agent) ?? [] };
}

const pauseFor = (bundle: AssembledWorkflow): AppDeps["pause"] =>
  bundle.needsApproval === undefined
    ? undefined
    : { checkpointer: new MemorySaver(), needsApproval: bundle.needsApproval };
/** One quality judge per agent with `reasoning` (Jev unless reasoning sets a model). */
const judgesFor = (
  config: AgentsConfigOf<string>,
  gateway: ModelGateway,
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
                gateway,
              ),
            ] as const,
          ],
    ),
  );

/** Guards from config + their texts; each guard is a router (Jev unless it sets a model). */
const guardsFor = (config: AgentsConfigOf<string>, gateway: ModelGateway): GuardSet =>
  buildGuards(config.guards, guardPrompts, (name, model) =>
    createRouter(`guard:${name}`, model ?? config.defaults.router, config.defaults.chat, gateway),
  );

/** The workflow's flow, limits and routers; each router decides on its own model. */
const flowFor = (
  bundle: AssembledWorkflow,
  config: AgentsConfigOf<string>,
  gateway: ModelGateway,
): Pick<AppDeps, "flow" | "limits" | "routers" | "routerFor"> => ({
  flow: bundle.flow,
  limits: bundle.limits,
  routers: bundle.routers,
  routerFor: flowRouterFactory({
    gateway,
    chatDefaults: config.defaults.chat,
    chatModelSettings: chatModelSettingsOf(config),
  }),
});

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
        `config "${deps.config.name}" ${configVersion} changed without a version bump (hash ${shortVersion(configHash)})`,
      ]
    : [];
}

/**
 * Production wiring of a workflow (default: the project's agents): OpenRouter (chat + Jev), MCP
 * servers, file spend ledger, Tern store. Fails fast when an MCP server is unavailable or drifted.
 * Every model call goes through `gateway` (default: OpenRouter, credentials from `env`).
 */
export async function createAppDeps(
  bundle: AssembledWorkflow,
  env: NodeJS.ProcessEnv = process.env,
  makeTransport?: TransportFactory,
  gateway: ModelGateway = createOpenRouterGateway(env),
): Promise<AppDeps> {
  const services = servicesFor(bundle, gateway, env);
  const tools: readonly AnyTool[] = resolveTools(bundle, services);
  const config = validateAgentsConfig(
    bundle.config,
    tools.map((tool) => tool.name),
  );
  const mcp = await connectMcpServers(
    config.mcpServers,
    bundle.mcpServers,
    bundle.serverTools ?? [],
    env,
    makeTransport,
  );
  const terns = createSqliteTernStore(env.TERN_DB ?? DEFAULT_TERN_DB);
  const tracing = langfuseTracing(env);
  const ledger = createFileLedger(env.SPEND_LEDGER_DIR ?? DEFAULT_LEDGER_DIR);
  const deps = {
    config,
    registry: createModelRegistry(config, gateway),
    ...flowFor(bundle, config, gateway),
    prompts: bundle.prompts,
    guards: guardsFor(config, gateway),
    judges: judgesFor(config, gateway),
    tools: toolLookup(tools),
    pause: pauseFor(bundle),
    compactionPrompt: bundle.compactionPrompt,
    ...knowledgeFor(bundle, services),
    ledger,
    terns,
    evaluation: evaluationFor(bundle, { terns, ledger }, gateway),
    tracing,
    close: async () => {
      await mcp.close();
      await tracing?.shutdown();
      terns.close();
    },
  };
  return { ...deps, warnings: await versionWarnings(deps) };
}
