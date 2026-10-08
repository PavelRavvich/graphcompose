import { mcpServer } from "../tools/index.js";
import { validateAgentsConfig } from "../config/types.js";
import { renderPromptVariables } from "./prompt-render.js";
import { objectSchemaOf } from "../dto/schema.js";
import { checkGraph, dependencyTree } from "./container.js";
import { checkToolData, CORE_TOKENS, ragParts, rememberServers, toolBuilder, containerFor, } from "./runtime.js";
import { ragClassesOf, ragMeta, ragSettings, searchToolName } from "./rag.js";
import { ComponentError, componentOf, requireComponent } from "./metadata.js";
import { flowOf, settingsOf } from "./flow-parts.js";
/** An agent's settings as the config holds them (tools by name). */
function agentSettings(agent, names) {
    const optional = {
        thinking: agent.thinking,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        cache: agent.cache,
        historyLimit: agent.historyLimit,
        historySummaries: agent.historySummaries,
        maxToolCalls: agent.maxToolCalls,
        price: agent.price,
    };
    const search = (agent.rag ?? [])
        .filter((b) => b.mode === "tool")
        .map((b) => searchToolName(ragMeta(b.use)));
    const rag = ragSettings(agent);
    return {
        model: agent.model,
        description: agent.description,
        tools: [...(agent.tools ?? []).map((cls) => names.get(cls) ?? cls.name), ...search],
        ...(rag.length === 0 ? {} : { rag }),
        ...Object.fromEntries(Object.entries(optional).filter(([, value]) => value !== undefined)),
    };
}
function toolsOf(bundle, agents) {
    const classes = [...new Set(agents.flatMap((agent) => agent.tools ?? []))];
    for (const cls of classes) {
        const kind = componentOf(cls)?.kind;
        if (kind !== "tool" && kind !== "mcp-tool") {
            throw new ComponentError(`@Workflow "${bundle.name}": ${cls.name} in an agent's tools is not a @Tool or @McpTool`);
        }
        checkToolData(cls, kind);
    }
    return {
        local: classes.filter((cls) => componentOf(cls)?.kind === "tool"),
        mcp: classes.filter((cls) => componentOf(cls)?.kind === "mcp-tool"),
    };
}
function mcpOf(bundle, mcpTools) {
    const servers = (bundle.mcp ?? []).map((cls) => ({
        cls,
        ...requireComponent(cls, "mcp-server", `@Workflow "${bundle.name}"`).meta,
    }));
    const handles = [];
    const serverTools = [];
    const instances = new Map();
    for (const server of servers) {
        const handle = mcpServer(server.name);
        handles.push(handle);
        const facades = new Map(Object.entries(server.tools).map(([tool, schemas]) => [
            tool,
            handle.tool({
                tool,
                description: `${server.name}: ${tool}`,
                input: objectSchemaOf(schemas.input),
                output: objectSchemaOf(schemas.output),
            }),
        ]));
        serverTools.push(...facades.values());
        const instance = new server.cls();
        instance.attachServerTools(facades);
        instances.set(server.cls, instance);
    }
    for (const cls of mcpTools) {
        const { meta } = requireComponent(cls, "mcp-tool", `@Workflow "${bundle.name}"`);
        if (!instances.has(meta.server)) {
            throw new ComponentError(`@McpTool ${cls.name}: its server ${meta.server.name} is not in @Workflow({ mcp })`);
        }
    }
    return {
        servers,
        handles,
        serverTools,
        instances,
        names: new Map(servers.map((s) => [s.cls, s.name])),
    };
}
function configOf(bundle, agents, names, mcp) {
    return {
        name: bundle.name,
        version: bundle.version,
        defaults: bundle.defaults,
        ...(bundle.guards === undefined ? {} : { guards: bundle.guards }),
        ...(bundle.compaction === undefined ? {} : { compaction: bundle.compaction }),
        ...(mcp.servers.length === 0
            ? {}
            : { mcpServers: Object.fromEntries(mcp.servers.map((s) => [s.name, s.config])) }),
        agents: Object.fromEntries(agents.map((agent) => [agent.name, agentSettings(agent, names)])),
    };
}
/** Tool classes → their tool names. */
const toolNames = (tools) => new Map([
    ...tools.local.map((cls) => [cls, requireComponent(cls, "tool", "workflowOf").meta.name]),
    ...tools.mcp.map((cls) => [cls, requireComponent(cls, "mcp-tool", "workflowOf").meta.name]),
]);
/**
 * Assembles a `@Workflow` class into the workflow the core runs: its flow checked against every rule
 * (all violations at once), router texts loaded, limits from `settings()`, config, prompts, tools, MCP.
 */
export async function workflowOf(bundleClass) {
    const { meta: bundle } = requireComponent(bundleClass, "workflow", "workflowOf");
    const graph = await flowOf(bundle);
    const agents = graph.agents;
    const tools = toolsOf(bundle, agents);
    const mcp = mcpOf(bundle, tools.mcp);
    const rags = ragClassesOf(bundle, agents);
    checkGraph([...tools.local, ...tools.mcp, ...rags, ...graph.actions.map((a) => a.cls)], bundle.providers ?? [], [...CORE_TOKENS, ...mcp.instances.keys()]);
    rememberServers(bundle, mcp.instances);
    const names = toolNames(tools);
    const prompts = Object.fromEntries(agents.map((agent) => [
        agent.name,
        renderPromptVariables(agent.name, agent, agent.source, {
            ...(bundle.promptVariables ?? {}),
            ...(agent.promptVariables ?? {}),
        }),
    ]));
    const config = configOf(bundle, agents, names, mcp);
    const settings = settingsOf(bundleClass, bundle);
    validateAgentsConfig(config, [
        ...names.values(),
        ...rags.map((cls) => searchToolName(ragMeta(cls))),
    ]);
    const resolveMap = (map, services) => new Map(Array.from(map.entries()).map(([k, classes]) => [k, classes.map((cls) => containerFor(bundle, services).get(cls))]));
    const agentPii = new Map(agents.map((a) => [
        a.name,
        a.overridePiiPolicies
            ? { override: true, classes: a.overridePiiPolicies, disable: a.disablePiiPolicies ?? [] }
            : { override: false, classes: a.piiPolicies ?? [], disable: a.disablePiiPolicies ?? [] },
    ]));
    const agentGuardrails = new Map(agents.map((a) => [
        a.name,
        a.overrideGuardrails
            ? { override: true, classes: a.overrideGuardrails, disable: a.disableGuardrails ?? [] }
            : { override: false, classes: a.guardrails ?? [], disable: a.disableGuardrails ?? [] },
    ]));
    const toolPii = new Map(Array.from(tools.local).map((t) => {
        const meta = componentOf(t)?.meta;
        return [
            names.get(t) ?? t.name,
            meta?.overridePiiPolicies
                ? {
                    override: true,
                    classes: meta.overridePiiPolicies,
                    disable: meta.disablePiiPolicies ?? [],
                }
                : {
                    override: false,
                    classes: meta?.piiPolicies ?? [],
                    disable: meta?.disablePiiPolicies ?? [],
                },
        ];
    }));
    const toolGuardrails = new Map(Array.from(tools.local).map((t) => {
        const meta = componentOf(t)?.meta;
        return [
            names.get(t) ?? t.name,
            meta?.overrideGuardrails
                ? {
                    override: true,
                    classes: meta.overrideGuardrails,
                    disable: meta.disableGuardrails ?? [],
                }
                : {
                    override: false,
                    classes: meta?.guardrails ?? [],
                    disable: meta?.disableGuardrails ?? [],
                },
        ];
    }));
    const wfPii = bundle.piiPolicies ?? [];
    const wfGuardrails = bundle.guardrails ?? [];
    const resolveComplexMap = (map, services) => new Map(Array.from(map.entries()).map(([k, v]) => [
        k,
        {
            override: v.override,
            instances: v.classes.map((cls) => containerFor(bundle, services).get(cls)),
            disable: v.disable,
        },
    ]));
    return {
        config,
        flow: bundle.flow,
        piiPolicies: (services) => resolveComplexMap(agentPii, services),
        guardrails: (services) => resolveComplexMap(agentGuardrails, services),
        toolPiiPolicies: (services) => resolveComplexMap(toolPii, services),
        toolGuardrails: (services) => resolveComplexMap(toolGuardrails, services),
        workflowPiiPolicies: (services) => wfPii.map((c) => containerFor(bundle, services).get(c)),
        workflowGuardrails: (services) => wfGuardrails.map((c) => containerFor(bundle, services).get(c)),
        limits: settings.limits,
        models: settings.models,
        routers: graph.routers,
        prompts,
        tools: toolBuilder(bundle, agents, tools.local, tools.mcp, mcp.names),
        actions: (services) => {
            const container = containerFor(bundle, services);
            return new Map(graph.actions.map((a) => [a.name, container.get(a.cls)]));
        },
        ...(rags.length === 0 ? {} : ragParts(bundle, agents, rags)),
        mcpServers: mcp.handles,
        serverTools: mcp.serverTools,
        toolDependencies: Object.fromEntries([...tools.local, ...tools.mcp].flatMap((cls) => {
            const tree = dependencyTree(cls, bundle.providers ?? []);
            return tree === "" ? [] : [[names.get(cls) ?? cls.name, tree]];
        })),
        ...(bundle.compactionPrompt === undefined ? {} : { compactionPrompt: bundle.compactionPrompt }),
    };
}
