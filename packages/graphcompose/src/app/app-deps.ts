import { MemorySaver, type BaseCheckpointSaver } from "@langchain/langgraph";
import { homedir } from "node:os";
import { join } from "node:path";
import { resolveTools, type AssembledWorkflow } from "../workflow.js";
import { validateAgentsConfig, type AgentsConfigOf } from "../config/types.js";
import type { ContainerOptions } from "../components/container.js";
import { startAll, stopAll } from "../components/lifecycle.js";
import { createFileLedger, type Clock, type SpendLedger } from "../finops/ledger.js";
import type { EvalDeps } from "../eval/eval.js";
import type { RunDeps } from "../run/types.js";
import { configSnapshot, runVersions } from "../run/versions.js";
import {
  createSqliteTernStore,
  shortVersion,
  stableJson,
  type NewThreadId,
  type TernStore,
} from "../terns/index.js";
import { langfuseTracing } from "../tracing/index.js";
import { createOpenRouterGateway, type ModelGateway } from "../llm/gateway.js";
import { createModelRegistry } from "../llm/registry.js";
import {
  connectMcpServers,
  type AnyTool,
  type McpConnections,
  type TransportFactory,
} from "../tools/index.js";
import {
  evaluationFor,
  flowFor,
  guardsFor,
  judgesFor,
  knowledgeFor,
  pauseFor,
  servicesFor,
  toolLookup,
} from "./parts.js";

/** Daily spend ledgers live outside the repo. */
export const DEFAULT_LEDGER_DIR = join(homedir(), ".langgraph-agents", "spend");

/** Terns (runs, threads, scores) live outside the repo. */
export const DEFAULT_TERN_DB = join(homedir(), ".langgraph-agents", "terns.sqlite");

/** Run dependencies, eval dependencies, and resources to release after the run. */
export interface AppDeps extends RunDeps<string> {
  readonly evaluation: EvalDeps;
  /** Startup warnings, e.g. a config changed without a version bump. */
  readonly warnings: readonly string[];
  /** Runs `onStop` of the components, closes MCP connections, tracing and the stores it opened. */
  readonly close: () => Promise<void>;
}

/** Where an app keeps its state; each one given is shared and stays open when the app closes. */
export interface AppStores {
  readonly checkpointer?: BaseCheckpointSaver;
  readonly ledger?: SpendLedger;
  readonly terns?: TernStore;
}

/** How the MCP servers of a workflow get connected (default: their configured transports). */
export type McpConnect = (
  bundle: AssembledWorkflow,
  config: AgentsConfigOf<string>,
  env: NodeJS.ProcessEnv,
) => Promise<McpConnections>;

/** Everything an app may be given instead of its production default. */
export interface AppDepsOptions {
  /** Default: process.env. */
  readonly env?: NodeJS.ProcessEnv;
  /** Every model call goes through it. Default: OpenRouter, credentials from `env`. */
  readonly gateway?: ModelGateway;
  /** MCP transports by server (default: stdio / streamable HTTP from the server's config). */
  readonly transport?: TransportFactory;
  /** Replaces how MCP servers are connected (test stubs). */
  readonly connectMcp?: McpConnect;
  readonly stores?: AppStores;
  /** The time for the ledger's day and the Terns. Default: the system clock. */
  readonly clock?: Clock;
  readonly newThreadId?: NewThreadId;
  readonly newRunId?: () => string;
  readonly container?: ContainerOptions;
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

const connectConfigured =
  (transport: TransportFactory | undefined): McpConnect =>
  (bundle, config, env) =>
    connectMcpServers(
      config.mcpServers,
      bundle.mcpServers,
      bundle.serverTools ?? [],
      env,
      transport,
    );

/** The stores of an app: the ones given, else production defaults; `owned` are closed with the app. */
function storesOf(options: AppDepsOptions, env: NodeJS.ProcessEnv) {
  const clock = options.clock ?? ((): Date => new Date());
  const given = options.stores?.terns;
  const terns =
    given ?? createSqliteTernStore(env.TERN_DB ?? DEFAULT_TERN_DB, clock, options.newThreadId);
  return {
    terns,
    ownsTerns: given === undefined,
    ledger:
      options.stores?.ledger ?? createFileLedger(env.SPEND_LEDGER_DIR ?? DEFAULT_LEDGER_DIR, clock),
    checkpointer: options.stores?.checkpointer ?? new MemorySaver(),
  };
}

/** Collects the container's instances for their lifecycle hooks, keeping any hook already given. */
function lifecycleOf(container: ContainerOptions | undefined) {
  const created: unknown[] = [];
  const options: ContainerOptions = {
    ...container,
    onCreate: (instance) => {
      created.push(instance);
      container?.onCreate?.(instance);
    },
  };
  return { created, options };
}

/**
 * Production wiring of a workflow: OpenRouter (chat + Jev) behind the model gateway, MCP servers, file
 * spend ledger, Tern store; every part can be given instead (`options`, e.g. by `graphcompose/testing`).
 * Fails fast when an MCP server is unavailable or drifted. Components' `onStart` runs at the end.
 */
export async function createAppDeps(
  bundle: AssembledWorkflow,
  options: AppDepsOptions = {},
): Promise<AppDeps> {
  const env = options.env ?? process.env;
  const gateway = options.gateway ?? createOpenRouterGateway(env);
  const lifecycle = lifecycleOf(options.container);
  const services = servicesFor(bundle, gateway, env, lifecycle.options);
  const tools: readonly AnyTool[] = resolveTools(bundle, services);
  const config = validateAgentsConfig(
    bundle.config,
    tools.map((tool) => tool.name),
  );
  const mcp = await (options.connectMcp ?? connectConfigured(options.transport))(
    bundle,
    config,
    env,
  );
  const { terns, ownsTerns, ledger, checkpointer } = storesOf(options, env);
  const tracing = langfuseTracing(env);
  const deps = {
    config,
    registry: createModelRegistry(config, gateway),
    ...flowFor(bundle, config, gateway),
    prompts: bundle.prompts,
    guards: guardsFor(config, gateway),
    judges: judgesFor(config, gateway),
    tools: toolLookup(tools),
    pause: pauseFor(bundle, checkpointer),
    compactionPrompt: bundle.compactionPrompt,
    ...knowledgeFor(bundle, services),
    ledger,
    terns,
    evaluation: evaluationFor(bundle, { terns, ledger }, gateway),
    tracing,
    ...(options.newRunId === undefined ? {} : { newRunId: options.newRunId }),
    close: async () => {
      try {
        await stopAll(lifecycle.created);
      } finally {
        await mcp.close();
        await tracing?.shutdown();
        if (ownsTerns) terns.close();
      }
    },
  };
  await startAll(lifecycle.created);
  return { ...deps, warnings: await versionWarnings(deps) };
}
