import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { AgentBundle, BundleServices } from "../bundle.js";
import { validateAgentsConfig, type AgentsConfigOf } from "../config/types.js";
import type { Router } from "../routers/index.js";
import {
  defineTool,
  mcpServer,
  type AnyTool,
  type Tool,
  type ToolContext,
} from "../tools/index.js";
import { checkGraph, createContainer, dependencyTree } from "./container.js";
import type { ToolHandler } from "./decorators.js";
import { InjectionToken, type Class, type Token } from "./injection.js";
import { ComponentError, componentOf, requireComponent, type ToolMeta } from "./metadata.js";
import type { AgentMeta, BundleMeta } from "./meta-types.js";

/** Core services a component can depend on. */
export const ROUTER_FACTORY = new InjectionToken<(name: string) => Router>("ROUTER_FACTORY");
export const ENV = new InjectionToken<NodeJS.ProcessEnv>("ENV");
const CORE_TOKENS = [ROUTER_FACTORY, ENV];

/**
 * A tool component instance as the core's tool (validation, timeout, errors to the model), typed
 * from its `run` — e.g. in tests: `toolOf(new GreenhouseJobs(fakeJudge, search, fakeFetch))`.
 */
export function toolOf<TInput, TOutput>(instance: {
  run(input: TInput, ctx: ToolContext): Promise<TOutput>;
}): Tool<string, TInput, TOutput> {
  const { meta } = requireComponent(instance.constructor as Class, "tool", "toolOf");
  // The decorator's schemas are erased in metadata; `run` is what they validate for.
  return adapt(instance, meta) as unknown as Tool<string, TInput, TOutput>;
}

const adapt = (
  handler: ToolHandler<ToolMeta["input"], ToolMeta["output"]>,
  meta: ToolMeta,
): AnyTool =>
  defineTool({
    name: meta.name,
    description: meta.description,
    input: meta.input,
    output: meta.output,
    ...(meta.effect === undefined ? {} : { effect: meta.effect }),
    ...(meta.timeoutMs === undefined ? {} : { timeoutMs: meta.timeoutMs }),
    run: (input, ctx) => handler.run(input, ctx),
  });

async function promptOf(
  agent: AgentMeta,
  variables: Readonly<Record<string, string>>,
): Promise<string> {
  const path = fileURLToPath(agent.prompt);
  const text = await readFile(path, "utf8").catch(() => {
    throw new ComponentError(`@Agent "${agent.name}": prompt file not found: ${path}`);
  });
  return text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = variables[key];
    if (value === undefined)
      throw new ComponentError(`@Agent "${agent.name}": unknown prompt variable {{${key}}}`);
    return value;
  });
}

/** An agent's settings as the config holds them (tools by name). */
function agentSettings(
  agent: AgentMeta,
  names: ReadonlyMap<Class, string>,
): AgentsConfigOf<string>["agents"][string] {
  const optional = {
    thinking: agent.thinking,
    temperature: agent.temperature,
    maxTokens: agent.maxTokens,
    cache: agent.cache,
    historyLimit: agent.historyLimit,
    historySummaries: agent.historySummaries,
    maxToolCalls: agent.maxToolCalls,
    reasoning: agent.reasoning,
  };
  return {
    model: agent.model,
    price: agent.price,
    description: agent.description,
    tools: (agent.tools ?? []).map((cls) => names.get(cls) ?? cls.name),
    ...Object.fromEntries(Object.entries(optional).filter(([, value]) => value !== undefined)),
  };
}

function toolsOf(bundle: BundleMeta, agents: readonly AgentMeta[]) {
  const classes = [...new Set(agents.flatMap((agent) => agent.tools ?? []))];
  for (const cls of classes) {
    const kind = componentOf(cls)?.kind;
    if (kind !== "tool" && kind !== "mcp-tool") {
      throw new ComponentError(
        `@Bundle "${bundle.name}": ${cls.name} in an agent's tools is not a @Tool or @McpTool`,
      );
    }
  }
  return {
    local: classes.filter((cls) => componentOf(cls)?.kind === "tool"),
    mcp: classes.filter((cls) => componentOf(cls)?.kind === "mcp-tool"),
  };
}

function mcpOf(bundle: BundleMeta, mcpTools: readonly Class[]) {
  const servers = (bundle.mcp ?? []).map((cls) => ({
    cls,
    ...requireComponent(cls, "mcp-server", `@Bundle "${bundle.name}"`).meta,
  }));
  const handles = new Map(servers.map((server) => [server.cls, mcpServer(server.name)] as const));
  const facades = new Map<Class, AnyTool>();
  for (const cls of mcpTools) {
    const { meta } = requireComponent(cls, "mcp-tool", `@Bundle "${bundle.name}"`);
    const handle = handles.get(meta.server);
    if (handle === undefined) {
      throw new ComponentError(
        `@McpTool ${cls.name}: its server ${meta.server.name} is not in @Bundle({ mcp })`,
      );
    }
    facades.set(
      cls,
      handle.tool({
        tool: meta.tool,
        description: meta.description,
        input: meta.input,
        output: meta.output,
        ...(meta.effect === undefined ? {} : { effect: meta.effect }),
        ...(meta.timeoutMs === undefined ? {} : { timeoutMs: meta.timeoutMs }),
      }),
    );
  }
  return { servers, handles: [...handles.values()], facades };
}

type Mcp = ReturnType<typeof mcpOf>;

function configOf(
  bundle: BundleMeta,
  agents: readonly AgentMeta[],
  names: ReadonlyMap<Class, string>,
  mcp: Mcp,
): AgentsConfigOf<string> {
  return {
    name: bundle.name,
    version: bundle.version,
    defaults: bundle.defaults,
    budget: bundle.budget,
    routers: bundle.routers,
    ...(bundle.guards === undefined ? {} : { guards: bundle.guards }),
    ...(bundle.compaction === undefined ? {} : { compaction: bundle.compaction }),
    ...(mcp.servers.length === 0
      ? {}
      : { mcpServers: Object.fromEntries(mcp.servers.map((s) => [s.name, s.config])) }),
    agents: Object.fromEntries(agents.map((agent) => [agent.name, agentSettings(agent, names)])),
  };
}

/** Tools per run of the app: the container creates the tool instances with the core services. */
const toolBuilder =
  (bundle: BundleMeta, local: readonly Class[], mcp: Mcp) =>
  (services: BundleServices): readonly AnyTool[] => {
    const core = new Map<Token, unknown>([
      [ROUTER_FACTORY, services.router],
      [ENV, services.env ?? process.env],
    ]);
    const container = createContainer(bundle.providers ?? [], core);
    const instances = local.map((cls) =>
      adapt(
        container.get(cls) as ToolHandler<ToolMeta["input"], ToolMeta["output"]>,
        requireComponent(cls, "tool", "bundleOf").meta,
      ),
    );
    return [...instances, ...mcp.facades.values()];
  };

/** Assembles a `@Bundle` class into the bundle the core runs (config, prompts, tools, MCP). */
export async function bundleOf(bundleClass: Class): Promise<AgentBundle> {
  const { meta: bundle } = requireComponent(bundleClass, "bundle", "bundleOf");
  const agents = bundle.agents.map(
    (cls) => requireComponent(cls, "agent", `@Bundle "${bundle.name}"`).meta,
  );
  const tools = toolsOf(bundle, agents);
  const mcp = mcpOf(bundle, tools.mcp);
  checkGraph(tools.local, bundle.providers ?? [], CORE_TOKENS);
  const names = new Map<Class, string>([
    ...tools.local.map(
      (cls) => [cls, requireComponent(cls, "tool", "bundleOf").meta.name] as const,
    ),
    ...[...mcp.facades].map(([cls, tool]) => [cls, tool.name] as const),
  ]);
  const prompts = Object.fromEntries(
    await Promise.all(
      agents.map(
        async (agent) => [agent.name, await promptOf(agent, bundle.promptVariables ?? {})] as const,
      ),
    ),
  );
  const config = configOf(bundle, agents, names, mcp);
  validateAgentsConfig(config, [...names.values()]);
  return {
    config,
    prompts,
    tools: toolBuilder(bundle, tools.local, mcp),
    mcpServers: mcp.handles,
    toolDependencies: Object.fromEntries(
      tools.local.flatMap((cls) => {
        const tree = dependencyTree(cls, bundle.providers ?? []);
        return tree === "" ? [] : [[names.get(cls) ?? cls.name, tree] as const];
      }),
    ),
    ...(bundle.needsApproval === undefined ? {} : { needsApproval: bundle.needsApproval }),
    ...(bundle.compactionPrompt === undefined ? {} : { compactionPrompt: bundle.compactionPrompt }),
  };
}
