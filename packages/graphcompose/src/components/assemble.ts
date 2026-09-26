import { readFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import type { AssembledWorkflow } from "../workflow.js";
import { validateAgentsConfig, type AgentsConfigOf } from "../config/types.js";
import { mcpServer, type AnyTool } from "../tools/index.js";
import { renderTemplate } from "../scaffold/render.js";
import { checkGraph, dependencyTree } from "./container.js";
import { CORE_TOKENS, ragParts, toolBuilder } from "./runtime.js";
import { ragClassesOf, ragMeta, ragSettings, searchToolName } from "./rag.js";
import { type Class } from "./injection.js";
import { ComponentError, componentOf, requireComponent } from "./metadata.js";
import type { AgentMeta, WorkflowMeta } from "./meta-types.js";

/** The agent's prompt file: `prompt` relative to the agent's file, or `<name>.prompt.md` next to it. */
function promptPath(agent: AgentMeta): string {
  if (agent.source === undefined) {
    throw new ComponentError(`@Agent "${agent.name}": cannot tell which file it is declared in`);
  }
  const dir = dirname(agent.source);
  if (agent.prompt !== undefined) return resolve(dir, agent.prompt);
  return join(dir, `${basename(agent.source).replace(/(\.agent)?\.[cm]?[jt]s$/, "")}.prompt.md`);
}

async function promptOf(
  agent: AgentMeta,
  variables: Readonly<Record<string, string>>,
): Promise<string> {
  const path = promptPath(agent);
  const text = await readFile(path, "utf8").catch(() => {
    throw new ComponentError(`@Agent "${agent.name}": prompt file not found: ${path}`);
  });
  return renderTemplate(
    text,
    variables,
    (key) => new ComponentError(`@Agent "${agent.name}": unknown prompt variable {{${key}}}`),
  );
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
  const search = (agent.rag ?? [])
    .filter((b) => b.mode === "tool")
    .map((b) => searchToolName(ragMeta(b.use)));
  const rag = ragSettings(agent);
  return {
    model: agent.model,
    price: agent.price,
    description: agent.description,
    tools: [...(agent.tools ?? []).map((cls) => names.get(cls) ?? cls.name), ...search],
    ...(rag.length === 0 ? {} : { rag }),
    ...Object.fromEntries(Object.entries(optional).filter(([, value]) => value !== undefined)),
  };
}

function toolsOf(bundle: WorkflowMeta, agents: readonly AgentMeta[]) {
  const classes = [...new Set(agents.flatMap((agent) => agent.tools ?? []))];
  for (const cls of classes) {
    const kind = componentOf(cls)?.kind;
    if (kind !== "tool" && kind !== "mcp-tool") {
      throw new ComponentError(
        `@Workflow "${bundle.name}": ${cls.name} in an agent's tools is not a @Tool or @McpTool`,
      );
    }
  }
  return {
    local: classes.filter((cls) => componentOf(cls)?.kind === "tool"),
    mcp: classes.filter((cls) => componentOf(cls)?.kind === "mcp-tool"),
  };
}

function mcpOf(bundle: WorkflowMeta, mcpTools: readonly Class[]) {
  const servers = (bundle.mcp ?? []).map((cls) => ({
    cls,
    ...requireComponent(cls, "mcp-server", `@Workflow "${bundle.name}"`).meta,
  }));
  const handles = new Map(servers.map((server) => [server.cls, mcpServer(server.name)] as const));
  const facades = new Map<Class, AnyTool>();
  for (const cls of mcpTools) {
    const { meta } = requireComponent(cls, "mcp-tool", `@Workflow "${bundle.name}"`);
    const handle = handles.get(meta.server);
    if (handle === undefined) {
      throw new ComponentError(
        `@McpTool ${cls.name}: its server ${meta.server.name} is not in @Workflow({ mcp })`,
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
  bundle: WorkflowMeta,
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

/** Assembles a `@Workflow` class into the workflow the core runs (config, prompts, tools, MCP). */
export async function workflowOf(bundleClass: Class): Promise<AssembledWorkflow> {
  const { meta: bundle } = requireComponent(bundleClass, "workflow", "workflowOf");
  const agents = bundle.agents.map(
    (cls) => requireComponent(cls, "agent", `@Workflow "${bundle.name}"`).meta,
  );
  const tools = toolsOf(bundle, agents);
  const mcp = mcpOf(bundle, tools.mcp);
  const rags = ragClassesOf(bundle, agents);
  checkGraph([...tools.local, ...rags], bundle.providers ?? [], CORE_TOKENS);
  const names = new Map<Class, string>([
    ...tools.local.map(
      (cls) => [cls, requireComponent(cls, "tool", "workflowOf").meta.name] as const,
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
  validateAgentsConfig(config, [
    ...names.values(),
    ...rags.map((cls) => searchToolName(ragMeta(cls))),
  ]);
  return {
    config,
    prompts,
    tools: toolBuilder(bundle, agents, tools.local, mcp.facades),
    ...(rags.length === 0 ? {} : ragParts(bundle, agents, rags)),
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
