import type { AgentSettingsOf, AgentsConfigOf } from "../config/types.js";
import { DEFAULT_CRITERIA } from "../prompts/agents.js";
import type { GraphDeps } from "./deps.js";
import type { AgentDefinition } from "./nodes/agent.js";
import type { AgentReasoning } from "./nodes/attempts.js";

export class MissingAgentPromptError extends Error {
  override name = "MissingAgentPromptError";
}

/** Summaries a reader sees by default: defaults.history.summaries, else compaction.keep, else none. */
export const defaultSummaries = <TName extends string>(config: AgentsConfigOf<TName>): number =>
  config.defaults.history.summaries ?? config.compaction?.keep ?? 0;

/** An agent's limits with defaults applied. */
const limitsOf = <TName extends string>(
  agent: AgentSettingsOf<string> | undefined,
  config: AgentsConfigOf<TName>,
): { maxToolCalls: number; historyLimit: number; summariesLimit: number } => ({
  maxToolCalls: agent?.maxToolCalls ?? config.defaults.tools.maxToolCalls,
  historyLimit: agent?.historyLimit ?? config.defaults.history.limit,
  summariesLimit: agent?.historySummaries ?? defaultSummaries(config),
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

/** Every configured agent with its model, prompt, tools, limits, reasoning and knowledge. */
export function agentDefinitions<TName extends string>(
  deps: GraphDeps<TName>,
): ReadonlyMap<string, AgentDefinition> {
  const prompts = new Map<string, string>(Object.entries(deps.prompts));
  const settings = new Map<string, AgentSettingsOf<string>>(Object.entries(deps.config.agents));
  const definitions = new Map<string, AgentDefinition>();
  for (const [name, binding] of deps.registry.agents) {
    const systemPrompt = prompts.get(name);
    if (systemPrompt === undefined) throw new MissingAgentPromptError(`No prompt for ${name}`);
    const agent = settings.get(name);
    definitions.set(name, {
      binding,
      systemPrompt,
      tools: (agent?.tools ?? []).map(deps.tools),
      ...limitsOf(agent, deps.config),
      reasoning: reasoningOf(name, agent, deps),
      knowledge: deps.knowledge?.(name) ?? [],
    });
  }
  return definitions;
}
