import { schemaOf } from "../dto/schema.js";
import { defineTool } from "../tools/index.js";
import { createContainer } from "./container.js";
import { InjectionToken } from "./injection.js";
import { componentOf, requireComponent } from "./metadata.js";
import { contextSources, ragMeta, searchTool } from "./rag.js";
/** What a workflow creates per run of the app: the container, tool instances, knowledge sources. */
/** Core services a component can depend on. */
export const ROUTER_FACTORY = new InjectionToken("ROUTER_FACTORY");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ENV = new InjectionToken("ENV");
export const CORE_TOKENS = [ROUTER_FACTORY, ENV];
/**
 * A tool component instance as the core's tool (validation, timeout, errors to the model), typed
 * from its `run` — e.g. in tests: `toolOf(new GreenhouseJobs(fakeJudge, search, fakeFetch))`.
 */
export function toolOf(instance) {
    const cls = instance.constructor;
    const { meta } = componentOf(cls)?.kind === "mcp-tool"
        ? requireComponent(cls, "mcp-tool", "toolOf")
        : requireComponent(cls, "tool", "toolOf");
    // The decorator's DTOs are erased in metadata; `run` is what they validate for.
    return adapt(instance, meta);
}
/** The startup check of a tool's DTOs (undecorated fields, behaviour) — before any run. */
export const checkToolData = (cls, kind) => {
    const { meta } = requireComponent(cls, kind, "workflowOf");
    schemaOf(meta.input);
    schemaOf(meta.output);
};
export const adapt = (handler, meta) => defineTool({
    name: meta.name,
    description: meta.description,
    input: schemaOf(meta.input),
    output: schemaOf(meta.output),
    ...(meta.channel === undefined
        ? {}
        : { channel: requireComponent(meta.channel, "channel", "toolOf").meta.name }),
    ...(meta.timeoutMs === undefined ? {} : { timeoutMs: meta.timeoutMs }),
    run: (input, ctx) => handler.run(input, ctx),
});
/** Each workflow's MCP server instances (with their connected tools): injected like any dependency. */
const serverInstances = new WeakMap();
export const rememberServers = (bundle, instances) => {
    serverInstances.set(bundle, instances);
};
/** One container per workflow and app services: its tools, knowledge and index share instances. */
const containers = new WeakMap();
export const containerFor = (bundle, services) => {
    const perBundle = containers.get(bundle) ?? new WeakMap();
    containers.set(bundle, perBundle);
    const existing = perBundle.get(services);
    if (existing !== undefined)
        return existing;
    const core = new Map([
        [ROUTER_FACTORY, services.router],
        [ENV, services.env ?? process.env],
    ]);
    for (const [token, instance] of serverInstances.get(bundle) ?? [])
        core.set(token, instance);
    const container = createContainer(bundle.providers ?? [], core, services.container);
    perBundle.set(services, container);
    return container;
};
/** Tools per run of the app: tools and MCP tools (created by the container), knowledge-base search tools. */
export const toolBuilder = (bundle, agents, local, mcpTools, serverNames) => (services) => {
    const container = containerFor(bundle, services);
    const instances = local.map((cls) => adapt(container.get(cls), requireComponent(cls, "tool", "workflowOf").meta));
    const mcp = mcpTools.map((cls) => {
        const { meta } = requireComponent(cls, "mcp-tool", "workflowOf");
        const tool = adapt(container.get(cls), meta);
        return { ...tool, mcp: { server: serverNames.get(meta.server) ?? "", tool: meta.name } };
    });
    const searched = [
        ...new Set(agents.flatMap((a) => (a.rag ?? []).filter((b) => b.mode === "tool").map((b) => b.use))),
    ];
    const search = searched.map((cls) => searchTool(ragMeta(cls), container.get(cls)));
    return [...instances, ...mcp, ...search];
};
export const ragParts = (bundle, agents, rags) => ({
    knowledge: (services) => contextSources(agents, (cls) => containerFor(bundle, services).get(cls)),
    knowledgeBases: (services) => rags.map((cls) => ({
        name: ragMeta(cls).name,
        connector: containerFor(bundle, services).get(cls),
    })),
});
