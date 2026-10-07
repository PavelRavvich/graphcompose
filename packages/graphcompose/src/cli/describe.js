import { resolveTools } from "../workflow.js";
import { DEFAULT_MAX_TOKENS } from "../config/types.js";
import { resolveAgentLimits } from "../graph/agent-loop/index.js";
import { reasoningLabel, reasoningOfThinking } from "../models/reasoning.js";
import { flowLines } from "../graph/flow-text.js";
import { STEPS_PER_WORKING_NODE } from "../graph/limits.js";
import { isJevModel } from "../graph/router-model.js";
import { configSnapshot } from "../run/versions.js";
import { shortVersion, versionOf } from "../terns/index.js";
import { isMcpFacade } from "../tools/index.js";
/** Tools are built with a router that is never called — describing needs no key and no network. */
const describeServices = {
    router: (name) => ({
        name,
        route: () => Promise.reject(new Error("describe does not call routers")),
    }),
};
/** A component's reasoning; unset = its model provider's. */
const thinkingLabel = (thinking) => thinking === undefined ? "the provider's" : reasoningLabel(reasoningOfThinking(thinking));
function toolLine(tool, bundle) {
    const kind = isMcpFacade(tool) ? `MCP ${tool.mcp.server}` : "local";
    const waits = tool.channel ? ", uses channel" : "";
    const deps = bundle.toolDependencies?.[tool.name];
    return `${tool.name} (${tool.channel ? `channel:${tool.channel}, ` : ""}${kind}${waits})${deps === undefined ? "" : ` ← ${deps}`} — ${tool.description}`;
}
function bundleLines(bundle) {
    const c = bundle.config;
    const inputGuards = Object.entries(c.guards?.input ?? {}).map(([n, g]) => `${n} ≥${String(g.threshold)}`);
    const outputGuards = Object.entries(c.guards?.output ?? {}).map(([n, g]) => `${n} ≥${String(g.threshold)}`);
    const memory = c.compaction === undefined
        ? "raw turns only"
        : `compaction every ${String(c.compaction.every)} turns, keep ${String(c.compaction.keep)} summaries · ${c.compaction.model.model}`;
    return [
        `guards    input: ${inputGuards.join(", ") || "none"} · output: ${outputGuards.join(", ") || "none"}`,
        `memory    ${memory}`,
        `pause     on — tools with channel wait for external signal`,
        `limits    ${limitsLabel(bundle)}`,
    ];
}
/** `run 12 steps · $0.1 · day $1`; steps default to (agents + routers) × 3. */
function limitsLabel(bundle) {
    const { perRun, perDay } = bundle.limits;
    const working = Object.keys(bundle.config.agents).length + bundle.routers.length;
    const steps = perRun?.steps === undefined
        ? `${String(working * STEPS_PER_WORKING_NODE)} steps (default)`
        : `${String(perRun.steps)} steps`;
    const runCost = perRun?.cost === undefined ? "" : ` · $${String(perRun.cost)}`;
    const day = perDay?.cost === undefined ? "no daily cap" : `$${String(perDay.cost)}`;
    return `run ${steps}${runCost} · day ${day}`;
}
/** The flow as transitions, and each router's model and visit limit. */
function flowSection(bundle) {
    return [
        "flow",
        ...flowLines(bundle.flow).map((line) => `  ${line}`),
        "routers",
        ...bundle.routers.map((router) => `  ${router.name}  ${isJevModel(router.model) ? "jev" : "llm"} ${router.model}${router.maxVisits === undefined ? "" : ` · maxVisits ${String(router.maxVisits)}`} — ${router.description}`),
    ];
}
const ceilingLabel = (maxTokens) => maxTokens === "max"
    ? "no output ceiling"
    : `max ${String(maxTokens ?? DEFAULT_MAX_TOKENS)} tokens`;
/** `limits: modelCalls 12 (default) · toolCalls 8` — what one call of the agent may do. */
function limitsLine(agent, config) {
    const { limits, defaulted } = resolveAgentLimits(agent.maxToolCalls, config.defaults.tools?.maxToolCalls);
    const label = (limit) => `${limit} ${String(limits[limit])}${defaulted.includes(limit) ? " (default)" : ""}`;
    return `    limits: ${label("modelCalls")} · ${label("toolCalls")}`;
}
/** An agent's limits and knowledge bases. */
function settingsLines(agent, config) {
    return [
        limitsLine(agent, config),
        ...(agent.rag ?? []).map((kb) => `    rag: ${kb.name} (${kb.mode}, k ${String(kb.topK)})`),
    ];
}
function agentLines(bundle, tools) {
    const c = bundle.config;
    const defaultSummaries = c.defaults.history.summaries ?? c.compaction?.keep ?? 0;
    return Object.entries(c.agents).flatMap(([name, agent]) => {
        const summaries = c.compaction === undefined ? 0 : (agent.historySummaries ?? defaultSummaries);
        const history = `history ${String(agent.historyLimit ?? c.defaults.history.limit)} turns${summaries > 0 ? ` + ${String(summaries)} summaries` : ""}`;
        const own = (agent.tools ?? []).map((t) => tools.get(t));
        return [
            `  ${name}  ${agent.model} · reasoning ${thinkingLabel(agent.thinking ?? c.defaults.models.thinking)} · ${ceilingLabel(agent.maxTokens ?? c.defaults.models.maxTokens)} · ${history}`,
            `    ${agent.description}`,
            ...settingsLines(agent, c),
            ...(own.length === 0
                ? ["    tools: none"]
                : own.map((tool, i) => `    · ${tool === undefined ? `${agent.tools?.[i] ?? "?"} (not in the catalog)` : toolLine(tool, bundle)}`)),
        ];
    });
}
/** The workflow at a glance: settings, the flow as transitions, and which agent can use which tool. */
export function describeWorkflow(bundle, profile = "base") {
    const c = bundle.config;
    const tools = new Map(resolveTools(bundle, describeServices).map((tool) => [tool.name, tool]));
    const assigned = new Set(Object.values(c.agents).flatMap((agent) => agent.tools ?? []));
    const unassigned = [...tools.keys()].filter((name) => !assigned.has(name));
    return [
        `${c.name} ${c.version}${profile === "base" ? "" : ` (profile ${profile})`} · config ${shortVersion(versionOf(configSnapshot(bundle)))}`,
        ...bundleLines(bundle),
        ...flowSection(bundle),
        "agents",
        ...agentLines(bundle, tools),
        `unassigned tools: ${unassigned.join(", ") || "none"}`,
    ];
}
