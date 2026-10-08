import { MemorySaver } from "@langchain/langgraph";
import { homedir } from "node:os";
import { join } from "node:path";
import { resolveTools } from "../workflow.js";
import { validateAgentsConfig } from "../config/types.js";
import { initAll, assembleAll, startAll, stopAll } from "../components/lifecycle.js";
import { createFileLedger } from "../finops/ledger.js";
import { configSnapshot, runVersions } from "../run/versions.js";
import { createSqliteTernStore, shortVersion, stableJson, } from "../terns/index.js";
import { langfuseTracing } from "../tracing/index.js";
import { createModelRegistry } from "../llm/registry.js";
import { modelsFor, providerClientsOf } from "./models.js";
import { connectMcpServers, } from "../tools/index.js";
import { evaluationFor, flowFor, guardsFor, knowledgeFor, pauseFor, servicesFor, toolLookup, actionLookup, } from "./parts.js";
/** Daily spend ledgers live outside the repo. */
export const DEFAULT_LEDGER_DIR = join(homedir(), ".langgraph-agents", "spend");
/** Terns (runs, threads, scores) live outside the repo. */
export const DEFAULT_TERN_DB = join(homedir(), ".langgraph-agents", "terns.sqlite");
/** Run dependencies, eval dependencies, and resources to release after the run. */
import { ObserverManager } from "../core/observer-manager.js";
/** Stores the config snapshot of this version; warns when the version already had other content. */
async function versionWarnings(deps) {
    const { configVersion, configHash } = runVersions(deps);
    const { drift } = await deps.terns.rememberConfig(deps.config.name, configVersion, configHash, stableJson(configSnapshot(deps)));
    return drift
        ? [
            `config "${deps.config.name}" ${configVersion} changed without a version bump (hash ${shortVersion(configHash)})`,
        ]
        : [];
}
const connectConfigured = (transport) => (bundle, config, env) => connectMcpServers(config.mcpServers, bundle.mcpServers, bundle.serverTools ?? [], env, transport);
/** The stores of an app: the ones given, else production defaults; `owned` are closed with the app. */
function storesOf(options, env) {
    const clock = options.clock ?? (() => new Date());
    const given = options.stores?.terns;
    const terns = given ?? createSqliteTernStore(env.TERN_DB ?? DEFAULT_TERN_DB, clock, options.newThreadId);
    return {
        terns,
        ownsTerns: given === undefined,
        ledger: options.stores?.ledger ?? createFileLedger(env.SPEND_LEDGER_DIR ?? DEFAULT_LEDGER_DIR, clock),
        checkpointer: options.stores?.checkpointer ?? new MemorySaver(),
    };
}
/** Collects the container's instances for their lifecycle hooks, keeping any hook already given. */
function lifecycleOf(container) {
    const created = [];
    const options = {
        ...container,
        onCreate: (instance) => {
            created.push(instance);
            container?.onCreate?.(instance);
        },
    };
    return { created, options };
}
/**
 * Production wiring of a workflow: its model providers behind the model gateway (every model setting
 * checked against its model first), MCP servers, file
 * spend ledger, Tern store; every part can be given instead (`options`, e.g. by `graphcompose/testing`).
 * Fails fast when an MCP server is unavailable or drifted. Components' `onStart` runs at the end.
 */
export async function createAppDeps(bundle, options = {}) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const env = options.env ?? process.env;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const models = await modelsFor(bundle, options.gateway, providerClientsOf(options, env));
    const gateway = models.gateway;
    const lifecycle = lifecycleOf(options.container);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const services = servicesFor(bundle, gateway, env, lifecycle.options);
    const tools = resolveTools(bundle, services);
    const toolNames = tools.map((tool) => tool.name);
    const config = models.priced(validateAgentsConfig(bundle.config, toolNames));
    const mcp = await (options.connectMcp ?? connectConfigured(options.transport))(bundle, config, 
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    env);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const { terns, ownsTerns, ledger, checkpointer } = storesOf(options, env);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const tracing = langfuseTracing(env);
    const deps = {
        config,
        registry: createModelRegistry(config, gateway),
        ...flowFor(bundle, config, gateway),
        prompts: bundle.prompts,
        guards: guardsFor(config, gateway),
        tools: toolLookup(tools),
        actions: actionLookup(bundle, services),
        pause: pauseFor(bundle, checkpointer),
        requestApproval: async (channelName, req) => {
            const channels = bundle.channels?.(services);
            const channel = channels?.get(channelName);
            if (!channel)
                throw new Error(`Unknown channel: ${channelName}`);
            await channel.requestApproval(req);
        },
        compactionPrompt: bundle.compactionPrompt,
        piiPolicies: (agent) => bundle.piiPolicies?.(services)?.get(agent) ?? { override: false, instances: [], disable: [] },
        toolPiiPolicies: (tool) => bundle.toolPiiPolicies?.(services)?.get(tool) ?? {
            override: false,
            instances: [],
            disable: [],
        },
        toolGuardrails: (tool) => bundle.toolGuardrails?.(services)?.get(tool) ?? {
            override: false,
            instances: [],
            disable: [],
        },
        workflowPiiPolicies: bundle.workflowPiiPolicies?.(services) ?? [],
        workflowGuardrails: bundle.workflowGuardrails?.(services) ?? [],
        guardrails: (agent) => bundle.guardrails?.(services)?.get(agent) ?? { override: false, instances: [], disable: [] },
        channelAdapters: (channel) => bundle.channelAdapters?.(services)?.get(channel),
        ...knowledgeFor(bundle, services),
        ledger,
        terns,
        evaluation: evaluationFor(bundle, { terns, ledger }, gateway),
        tracing,
        container: {
            get: (token) => lifecycle.created.find((c) => c.constructor === token),
        },
        observer: new ObserverManager(lifecycle.created),
        ...(options.newRunId === undefined ? {} : { newRunId: options.newRunId }),
        close: async () => {
            try {
                await stopAll(lifecycle.created);
            }
            finally {
                await mcp.close();
                await tracing?.shutdown();
                if (ownsTerns)
                    terns.close();
            }
        },
    };
    await initAll(lifecycle.created);
    await assembleAll(lifecycle.created);
    await startAll(lifecycle.created);
    return { ...deps, models: models.summary, warnings: await versionWarnings(deps) };
}
