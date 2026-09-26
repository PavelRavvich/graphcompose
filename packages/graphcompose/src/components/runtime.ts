import type { AssembledWorkflow, WorkflowServices } from "../workflow.js";
import type { RagConnector } from "../rag/types.js";
import type { Router } from "../routers/index.js";
import { defineTool, type AnyTool, type Tool, type ToolContext } from "../tools/index.js";
import { createContainer, type Container } from "./container.js";
import type { ToolHandler } from "./decorators.js";
import { InjectionToken, type Class, type Token } from "./injection.js";
import { componentOf, requireComponent, type ToolMeta } from "./metadata.js";
import type { AgentMeta, WorkflowMeta } from "./meta-types.js";
import { contextSources, ragMeta, searchTool } from "./rag.js";

/** What a workflow creates per run of the app: the container, tool instances, knowledge sources. */

/** Core services a component can depend on. */
export const ROUTER_FACTORY = new InjectionToken<(name: string) => Router>("ROUTER_FACTORY");
export const ENV = new InjectionToken<NodeJS.ProcessEnv>("ENV");
export const CORE_TOKENS = [ROUTER_FACTORY, ENV];

/**
 * A tool component instance as the core's tool (validation, timeout, errors to the model), typed
 * from its `run` — e.g. in tests: `toolOf(new GreenhouseJobs(fakeJudge, search, fakeFetch))`.
 */
export function toolOf<TInput, TOutput>(instance: {
  run(input: TInput, ctx: ToolContext): Promise<TOutput>;
}): Tool<string, TInput, TOutput> {
  const cls = instance.constructor as Class;
  const { meta } =
    componentOf(cls)?.kind === "mcp-tool"
      ? requireComponent(cls, "mcp-tool", "toolOf")
      : requireComponent(cls, "tool", "toolOf");
  // The decorator's schemas are erased in metadata; `run` is what they validate for.
  return adapt(instance, meta) as unknown as Tool<string, TInput, TOutput>;
}

export const adapt = (handler: ToolHandler<unknown, unknown>, meta: ToolMeta): AnyTool =>
  defineTool({
    name: meta.name,
    description: meta.description,
    input: meta.input,
    output: meta.output,
    ...(meta.effect === undefined ? {} : { effect: meta.effect }),
    ...(meta.timeoutMs === undefined ? {} : { timeoutMs: meta.timeoutMs }),
    run: (input, ctx) => handler.run(input, ctx),
  });

/** Each workflow's MCP server instances (with their connected tools): injected like any dependency. */
const serverInstances = new WeakMap<WorkflowMeta, ReadonlyMap<Token, unknown>>();
export const rememberServers = (
  bundle: WorkflowMeta,
  instances: ReadonlyMap<Token, unknown>,
): void => {
  serverInstances.set(bundle, instances);
};

/** One container per workflow and app services: its tools, knowledge and index share instances. */
const containers = new WeakMap<WorkflowMeta, WeakMap<WorkflowServices, Container>>();
const containerFor = (bundle: WorkflowMeta, services: WorkflowServices): Container => {
  const perBundle = containers.get(bundle) ?? new WeakMap<WorkflowServices, Container>();
  containers.set(bundle, perBundle);
  const existing = perBundle.get(services);
  if (existing !== undefined) return existing;
  const core = new Map<Token, unknown>([
    [ROUTER_FACTORY, services.router],
    [ENV, services.env ?? process.env],
  ]);
  for (const [token, instance] of serverInstances.get(bundle) ?? []) core.set(token, instance);
  const container = createContainer(bundle.providers ?? [], core);
  perBundle.set(services, container);
  return container;
};

/** Tools per run of the app: tools and MCP tools (created by the container), knowledge-base search tools. */
export const toolBuilder =
  (
    bundle: WorkflowMeta,
    agents: readonly AgentMeta[],
    local: readonly Class[],
    mcpTools: readonly Class[],
    serverNames: ReadonlyMap<Class, string>,
  ) =>
  (services: WorkflowServices): readonly AnyTool[] => {
    const container = containerFor(bundle, services);
    const instances = local.map((cls) =>
      adapt(
        container.get(cls) as ToolHandler<unknown, unknown>,
        requireComponent(cls, "tool", "workflowOf").meta,
      ),
    );
    const mcp = mcpTools.map((cls) => {
      const { meta } = requireComponent(cls, "mcp-tool", "workflowOf");
      const tool = adapt(container.get(cls) as ToolHandler<unknown, unknown>, meta);
      return { ...tool, mcp: { server: serverNames.get(meta.server) ?? "", tool: meta.name } };
    });
    const searched = [
      ...new Set(
        agents.flatMap((a) => (a.rag ?? []).filter((b) => b.mode === "tool").map((b) => b.use)),
      ),
    ];
    const search = searched.map((cls) =>
      searchTool(ragMeta(cls), container.get(cls) as RagConnector),
    );
    return [...instances, ...mcp, ...search];
  };

export const ragParts = (
  bundle: WorkflowMeta,
  agents: readonly AgentMeta[],
  rags: readonly Class[],
): Required<Pick<AssembledWorkflow, "knowledge" | "knowledgeBases">> => ({
  knowledge: (services: WorkflowServices) =>
    contextSources(agents, (cls) => containerFor(bundle, services).get(cls) as RagConnector),
  knowledgeBases: (services: WorkflowServices) =>
    rags.map((cls) => ({
      name: ragMeta(cls).name,
      connector: containerFor(bundle, services).get(cls) as RagConnector,
    })),
});
