import { END, START, StateGraph } from "@langchain/langgraph";
import type { AgentPrompts, AgentSettingsOf, AgentsConfigOf } from "../config/types.js";
import type { ModelRegistry } from "../llm/registry.js";
import { FINISH_DESCRIPTION } from "../prompts/routing.js";
import type { RouteOption, Router } from "../routers/index.js";
import type { AnyTool } from "../tools/index.js";
import { makeAgentNode, type AgentDefinition } from "./nodes/agent.js";
import { finalize } from "./nodes/finalize.js";
import { makeRouterNode } from "./nodes/router.js";
import { AGENT_NODE, FINALIZE_NODE, ROUTER_NODE, routeAfterRouter } from "./routing.js";
import { AgentState, FINISH } from "./state.js";

export interface GraphDeps<TName extends string> {
  readonly config: AgentsConfigOf<TName>;
  readonly registry: ModelRegistry;
  /** The graph's main router (config.routers.main). */
  readonly router: Router;
  readonly prompts: AgentPrompts<TName>;
  /** Resolves a tool name from an agent's config to the tool. */
  readonly tools: (name: string) => AnyTool;
}

export class MissingAgentPromptError extends Error {
  override name = "MissingAgentPromptError";
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
      maxToolCalls: agent?.maxToolCalls ?? deps.config.defaults.tools.maxToolCalls,
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
        maxCostUsd: deps.config.budget.runBudgetCap,
      }),
    )
    .addNode(
      AGENT_NODE,
      makeAgentNode({
        agents: agentDefinitions(deps),
        bundle: deps.config.name,
        runBudgetCap: deps.config.budget.runBudgetCap,
      }),
    )
    .addNode(FINALIZE_NODE, finalize)
    .addEdge(START, ROUTER_NODE)
    .addConditionalEdges(ROUTER_NODE, routeAfterRouter, [AGENT_NODE, FINALIZE_NODE])
    .addEdge(AGENT_NODE, ROUTER_NODE)
    .addEdge(FINALIZE_NODE, END)
    .compile();

export type AgentGraph = ReturnType<typeof createGraph>;

/** START → router ⇄ agent → finalize → END. Router strategy, agents and models come from config. */
export function buildGraph<TName extends string>(deps: GraphDeps<TName>): AgentGraph {
  return createGraph(deps);
}
