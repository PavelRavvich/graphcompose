import { resolveTools, type AgentBundle, type BundleServices } from "../bundle.js";
import { resolveRouterModel, type RouterModel, type Thinking } from "../config/types.js";
import { isMcpFacade, type AnyTool } from "../tools/index.js";

/** Tools are built with a router that is never called — describing needs no key and no network. */
const describeServices: BundleServices = {
  router: (name) => ({
    name,
    route: () => Promise.reject(new Error("describe does not call routers")),
  }),
};

const thinkingLabel = (thinking: Thinking): string =>
  typeof thinking === "string" ? thinking : `${String(thinking.budgetTokens)} tokens`;

const routerLabel = (model: RouterModel): string => `${model.kind} ${model.model}`;

function toolLine(tool: AnyTool, bundle: AgentBundle): string {
  const kind = isMcpFacade(tool) ? `MCP ${tool.mcp.server}` : "local";
  const waits = bundle.needsApproval?.(tool) === true ? ", waits for approval" : "";
  const deps = bundle.toolDependencies?.[tool.name];
  return `${tool.name} (${tool.effect}, ${kind}${waits})${deps === undefined ? "" : ` ← ${deps}`} — ${tool.description}`;
}

function bundleLines(bundle: AgentBundle): string[] {
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
    `router    ${routerLabel(resolveRouterModel(c.routers.main, c.defaults))} · maxHops ${String(c.routers.main.maxHops)}`,
    `guards    input: ${inputGuards.join(", ") || "none"} · output: ${outputGuards.join(", ") || "none"}`,
    `memory    ${memory}`,
    `pause     ${bundle.needsApproval === undefined ? "off" : "on — marked tools wait for a human"}`,
    `budget    run $${String(c.budget.runBudgetCap)} · day $${String(c.budget.dailyBudgetCap)} · eval $${String(c.budget.evalBudgetCap)}`,
  ];
}

/** An agent's reasoning and knowledge bases, when it has them. */
function settingsLines(agent: AgentBundle["config"]["agents"][string]): string[] {
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

function agentLines(bundle: AgentBundle, tools: ReadonlyMap<string, AnyTool>): string[] {
  const c = bundle.config;
  const defaultSummaries = c.defaults.history.summaries ?? c.compaction?.keep ?? 0;
  return Object.entries(c.agents).flatMap(([name, agent]) => {
    const summaries = c.compaction === undefined ? 0 : (agent.historySummaries ?? defaultSummaries);
    const history = `history ${String(agent.historyLimit ?? c.defaults.history.limit)} turns${summaries > 0 ? ` + ${String(summaries)} summaries` : ""}`;
    const own = (agent.tools ?? []).map((t) => tools.get(t));
    return [
      `  ${name}  ${agent.model} · thinking ${thinkingLabel(agent.thinking ?? c.defaults.chat.thinking)} · ${history}`,
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

/** The bundle at a glance: settings, and which agent can use which tool. */
export function describeBundle(bundle: AgentBundle, profile = "base"): string[] {
  const c = bundle.config;
  const tools = new Map(
    resolveTools(bundle, describeServices).map((tool) => [tool.name, tool] as const),
  );
  const assigned = new Set(Object.values(c.agents).flatMap((agent) => agent.tools ?? []));
  const unassigned = [...tools.keys()].filter((name) => !assigned.has(name));
  return [
    `${c.name} ${c.version}${profile === "base" ? "" : ` (profile ${profile})`}`,
    ...bundleLines(bundle),
    "agents",
    ...agentLines(bundle, tools),
    `unassigned tools: ${unassigned.join(", ") || "none"}`,
  ];
}
