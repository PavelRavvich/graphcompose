import { resolveTools, type AssembledWorkflow, type WorkflowServices } from "../workflow.js";
import { DEFAULT_MAX_TOKENS, type ProviderPreferences, type Thinking } from "../config/types.js";
import { flowLines } from "../graph/flow-text.js";
import { STEPS_PER_WORKING_NODE } from "../graph/limits.js";
import { isJevModel } from "../graph/router-model.js";
import { configSnapshot } from "../run/versions.js";
import { shortVersion, versionOf } from "../terns/index.js";
import { isMcpFacade, type AnyTool } from "../tools/index.js";

/** Tools are built with a router that is never called — describing needs no key and no network. */
const describeServices: WorkflowServices = {
  router: (name) => ({
    name,
    route: () => Promise.reject(new Error("describe does not call routers")),
  }),
};

const thinkingLabel = (thinking: Thinking): string =>
  typeof thinking === "string" ? thinking : `${String(thinking.budgetTokens)} tokens`;

function toolLine(tool: AnyTool, bundle: AssembledWorkflow): string {
  const kind = isMcpFacade(tool) ? `MCP ${tool.mcp.server}` : "local";
  const waits = bundle.needsApproval?.(tool) === true ? ", waits for approval" : "";
  const deps = bundle.toolDependencies?.[tool.name];
  return `${tool.name} (${tool.effect}, ${kind}${waits})${deps === undefined ? "" : ` ← ${deps}`} — ${tool.description}`;
}

function bundleLines(bundle: AssembledWorkflow): string[] {
  const c = bundle.config;
  const inputGuards = Object.entries(c.guards?.input ?? {}).map(
    ([n, g]) => `${n} ≥${String(g.threshold)}`,
  );
  const outputGuards = Object.entries(c.guards?.output ?? {}).map(
    ([n, g]) => `${n} ≥${String(g.threshold)}`,
  );
  const memory =
    c.compaction === undefined
      ? "raw turns only"
      : `compaction every ${String(c.compaction.every)} turns, keep ${String(c.compaction.keep)} summaries · ${c.compaction.model.model}`;
  return [
    `guards    input: ${inputGuards.join(", ") || "none"} · output: ${outputGuards.join(", ") || "none"}`,
    `memory    ${memory}`,
    `pause     ${bundle.needsApproval === undefined ? "off" : "on — marked tools wait for a human"}`,
    `limits    ${limitsLabel(bundle)}`,
  ];
}

/** `run 12 steps · $0.1 · day $1`; steps default to (agents + routers) × 3. */
function limitsLabel(bundle: AssembledWorkflow): string {
  const { perRun, perDay } = bundle.limits;
  const working = Object.keys(bundle.config.agents).length + bundle.routers.length;
  const steps =
    perRun?.steps === undefined
      ? `${String(working * STEPS_PER_WORKING_NODE)} steps (default)`
      : `${String(perRun.steps)} steps`;
  const runCost = perRun?.cost === undefined ? "" : ` · $${String(perRun.cost)}`;
  const day = perDay?.cost === undefined ? "no daily cap" : `$${String(perDay.cost)}`;
  return `run ${steps}${runCost} · day ${day}`;
}

/** The flow as transitions, and each router's model and visit limit. */
function flowSection(bundle: AssembledWorkflow): string[] {
  return [
    "flow",
    ...flowLines(bundle.flow).map((line) => `  ${line}`),
    "routers",
    ...bundle.routers.map(
      (router) =>
        `  ${router.name}  ${isJevModel(router.model) ? "jev" : "llm"} ${router.model}${router.maxVisits === undefined ? "" : ` · maxVisits ${String(router.maxVisits)}`} — ${router.description}`,
    ),
  ];
}

const ceilingLabel = (maxTokens: number | "max" | undefined): string =>
  maxTokens === "max"
    ? "no output ceiling"
    : `max ${String(maxTokens ?? DEFAULT_MAX_TOKENS)} tokens`;

const providerLabel = (provider: ProviderPreferences | undefined): string => {
  if (provider === undefined) return "";
  const parts = [
    provider.only === undefined ? "" : `only ${provider.only.join(", ")}`,
    provider.order === undefined ? "" : `order ${provider.order.join(" > ")}`,
    provider.ignore === undefined ? "" : `ignore ${provider.ignore.join(", ")}`,
    provider.sort === undefined ? "" : `sort by ${provider.sort}`,
  ].filter((part) => part !== "");
  return parts.length === 0 ? "" : ` · providers: ${parts.join("; ")}`;
};

/** An agent's reasoning and knowledge bases, when it has them. */
function settingsLines(agent: AssembledWorkflow["config"]["agents"][string]): string[] {
  const r = agent.reasoning;
  const reasoning =
    r === undefined
      ? []
      : [
          `    reasoning: threshold ${String(r.threshold)} · ${String(r.maxAttempts)} attempts [${r.thinking.map(thinkingLabel).join(", ")}] · ${r.onExhausted ?? "best"}`,
        ];
  return [
    ...reasoning,
    ...(agent.rag ?? []).map((kb) => `    rag: ${kb.name} (${kb.mode}, k ${String(kb.k)})`),
  ];
}

function agentLines(bundle: AssembledWorkflow, tools: ReadonlyMap<string, AnyTool>): string[] {
  const c = bundle.config;
  const defaultSummaries = c.defaults.history.summaries ?? c.compaction?.keep ?? 0;
  return Object.entries(c.agents).flatMap(([name, agent]) => {
    const summaries = c.compaction === undefined ? 0 : (agent.historySummaries ?? defaultSummaries);
    const history = `history ${String(agent.historyLimit ?? c.defaults.history.limit)} turns${summaries > 0 ? ` + ${String(summaries)} summaries` : ""}`;
    const own = (agent.tools ?? []).map((t) => tools.get(t));
    return [
      `  ${name}  ${agent.model} · thinking ${thinkingLabel(agent.thinking ?? c.defaults.chat.thinking)} · ${ceilingLabel(agent.maxTokens ?? c.defaults.chat.maxTokens)} · ${history}${providerLabel(agent.provider ?? c.defaults.chat.provider)}`,
      `    ${agent.description}`,
      ...settingsLines(agent),
      ...(own.length === 0
        ? ["    tools: none"]
        : own.map(
            (tool, i) =>
              `    · ${tool === undefined ? `${agent.tools?.[i] ?? "?"} (not in the catalog)` : toolLine(tool, bundle)}`,
          )),
    ];
  });
}

/** The workflow at a glance: settings, the flow as transitions, and which agent can use which tool. */
export function describeWorkflow(bundle: AssembledWorkflow, profile = "base"): string[] {
  const c = bundle.config;
  const tools = new Map(
    resolveTools(bundle, describeServices).map((tool) => [tool.name, tool] as const),
  );
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
