import { END, START, StateGraph } from "@langchain/langgraph";
import type { AgentPrompts, AgentSettingsOf, AgentsConfigOf } from "../config/types.js";
import type { ModelRegistry } from "../llm/registry.js";
import { FINISH_DESCRIPTION } from "../prompts/routing.js";
import type { RouteOption, Router } from "../routers/index.js";
import type { GuardSet } from "../guards/index.js";
import type { PauseSeam } from "../pause/index.js";
import type { AnyTool } from "../tools/index.js";
import { makeAgentNode, type AgentDefinition } from "./nodes/agent.js";
import type { AgentReasoning } from "./nodes/attempts.js";
import { DEFAULT_CRITERIA } from "../prompts/agents.js";
import type { KnowledgeSource } from "../rag/types.js";
import { finalize } from "./nodes/finalize.js";
import { makeApprovalNode } from "./nodes/approval.js";
import { makeGuardNode } from "./nodes/guards.js";
import { makeRouterNode } from "./nodes/router.js";
import {
  AGENT_NODE,
  APPROVAL_NODE,
  FINALIZE_NODE,
  INPUT_GUARDS_NODE,
  OUTPUT_GUARDS_NODE,
  ROUTER_NODE,
  routeAfterAgent,
  routeAfterInputGuards,
  routeAfterRouter,
} from "./routing.js";
import { AgentState, FINISH } from "./state.js";

export interface GraphDeps<TName extends string> {
  readonly config: AgentsConfigOf<TName>;
  readonly registry: ModelRegistry;
  /** The graph's main router (config.routers.main). */
  readonly router: Router;
  readonly prompts: AgentPrompts<TName>;
  /** Resolves a tool name from an agent's config to the tool. */
  readonly tools: (name: string) => AnyTool;
  readonly guards: GuardSet;
  /** Quality judges by agent name (agents with `reasoning`). */
  readonly judges: ReadonlyMap<string, Router>;
  /** Context-mode knowledge bases per agent (knowledge bases, #88). */
  readonly knowledge?: (agent: string) => readonly KnowledgeSource[];
  /** Optional pause seam (human approval). Off by default. */
  readonly pause?: PauseSeam | undefined;
}

export class MissingAgentPromptError extends Error {
  override name = "MissingAgentPromptError";
}

/** Summaries a reader sees by default: defaults.history.summaries, else compaction.keep, else none. */
const defaultSummaries = <TName extends string>(deps: GraphDeps<TName>): number =>
  deps.config.defaults.history.summaries ?? deps.config.compaction?.keep ?? 0;

/** An agent's limits with defaults applied. */
const limitsOf = <TName extends string>(
  agent: AgentSettingsOf<string> | undefined,
  deps: GraphDeps<TName>,
): { maxToolCalls: number; historyLimit: number; summariesLimit: number } => ({
  maxToolCalls: agent?.maxToolCalls ?? deps.config.defaults.tools.maxToolCalls,
  historyLimit: agent?.historyLimit ?? deps.config.defaults.history.limit,
  summariesLimit: agent?.historySummaries ?? defaultSummaries(deps),
});

function reasoningOf<TName extends string>(
  name: string,
  agent: AgentSettingsOf<string> | undefined,
  deps: GraphDeps<TName>,
): AgentReasoning | undefined {
  const judge = deps.judges.get(name);
  const models = deps.registry.attempts.get(name);
  const reasoning = agent?.reasoning;
  if (reasoning === undefined || judge === undefined || models === undefined) return undefined;
  return {
    judge,
    models,
    threshold: reasoning.threshold,
    onExhausted: reasoning.onExhausted ?? "best",
    criteria: reasoning.criteria ?? DEFAULT_CRITERIA,
  };
}

const settingsByName = (
  agents: Readonly<Record<string, AgentSettingsOf<string>>>,
): ReadonlyMap<string, AgentSettingsOf<string>> => new Map(Object.entries(agents));

function agentDefinitions<TName extends string>(
  deps: GraphDeps<TName>,
): ReadonlyMap<string, AgentDefinition> {
  const prompts = new Map<string, string>(Object.entries(deps.prompts));
  const settings = settingsByName(deps.config.agents);
  const definitions = new Map<string, AgentDefinition>();
  for (const [name, binding] of deps.registry.agents) {
    const systemPrompt = prompts.get(name);
    if (systemPrompt === undefined) throw new MissingAgentPromptError(`No prompt for ${name}`);
    const agent = settings.get(name);
    definitions.set(name, {
      binding,
      systemPrompt,
      tools: (agent?.tools ?? []).map(deps.tools),
      ...limitsOf(agent, deps),
      reasoning: reasoningOf(name, agent, deps),
      knowledge: deps.knowledge?.(name) ?? [],
    });
  }
  return definitions;
}

function routeOptions(
  agents: Readonly<Record<string, { readonly description: string }>>,
): readonly RouteOption[] {
  const agentOptions = Object.entries(agents).map(([name, settings]) => ({
    name,
    description: settings.description,
  }));
  return [...agentOptions, { name: FINISH, description: FINISH_DESCRIPTION }];
}

const createGraph = <TName extends string>(deps: GraphDeps<TName>) =>
  new StateGraph(AgentState)
    .addNode(
      ROUTER_NODE,
      makeRouterNode({
        router: deps.router,
        options: routeOptions(deps.config.agents),
        maxHops: deps.config.routers.main.maxHops,
        historyLimit: deps.config.routers.main.historyLimit ?? deps.config.defaults.history.limit,
        summariesLimit: deps.config.routers.main.historySummaries ?? defaultSummaries(deps),
        maxCostUsd: deps.config.budget.runBudgetCap,
      }),
    )
    .addNode(
      AGENT_NODE,
      makeAgentNode({
        agents: agentDefinitions(deps),
        bundle: deps.config.name,
        runBudgetCap: deps.config.budget.runBudgetCap,
        needsApproval: deps.pause?.needsApproval,
      }),
    )
    .addNode(APPROVAL_NODE, makeApprovalNode({ tools: deps.tools, bundle: deps.config.name }))
    .addNode(FINALIZE_NODE, finalize)
    .addNode(INPUT_GUARDS_NODE, makeGuardNode(deps.guards.input, "input"))
    .addNode(OUTPUT_GUARDS_NODE, makeGuardNode(deps.guards.output, "output"))
    .addEdge(START, INPUT_GUARDS_NODE)
    .addConditionalEdges(INPUT_GUARDS_NODE, routeAfterInputGuards, [ROUTER_NODE, END])
    .addConditionalEdges(ROUTER_NODE, routeAfterRouter, [AGENT_NODE, FINALIZE_NODE])
    .addConditionalEdges(AGENT_NODE, routeAfterAgent, [ROUTER_NODE, APPROVAL_NODE])
    .addEdge(APPROVAL_NODE, AGENT_NODE)
    .addEdge(FINALIZE_NODE, OUTPUT_GUARDS_NODE)
    .addEdge(OUTPUT_GUARDS_NODE, END)
    .compile(deps.pause === undefined ? {} : { checkpointer: deps.pause.checkpointer });

export type AgentGraph = ReturnType<typeof createGraph>;

/** START → input guards → router ⇄ agent → finalize → output guards → END. All from config. */
export function buildGraph<TName extends string>(deps: GraphDeps<TName>): AgentGraph {
  return createGraph(deps);
}
