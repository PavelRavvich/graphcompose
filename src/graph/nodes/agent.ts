import { recordUsage } from "../../finops/usage.js";
import { withCacheBreakpoint } from "../../llm/cache.js";
import type { ModelBinding } from "../../llm/registry.js";
import { agentPrompt } from "../../prompts/agents.js";
import { formatContributions } from "../contributions.js";
import type { AgentStateType, AgentStateUpdate } from "../state.js";
import type { AsyncNode } from "../types.js";

/** Everything needed to run one configured agent. */
export interface AgentDefinition {
  readonly binding: ModelBinding;
  readonly systemPrompt: string;
}

export class UnknownAgentError extends Error {
  override name = "UnknownAgentError";
  constructor(agent: string) {
    super(`Unknown agent: ${agent}`);
  }
}

/** Runs the agent chosen by the router with its own model, prompt, thinking and cache settings. */
export function makeAgentNode(
  agents: ReadonlyMap<string, AgentDefinition>,
): AsyncNode<AgentStateType, AgentStateUpdate> {
  return async (state) => {
    const agent = agents.get(state.next);
    if (agent === undefined) throw new UnknownAgentError(state.next);
    const prompt = await agentPrompt.formatMessages({
      system: agent.systemPrompt,
      task: state.task,
      contributions: formatContributions(state.contributions),
    });
    const response = await agent.binding.model.invoke(
      withCacheBreakpoint(prompt, agent.binding.settings),
    );
    return {
      hops: 1,
      contributions: [{ agent: state.next, content: response.text.trim() }],
      usage: [recordUsage(state.next, agent.binding.settings, response)],
    };
  };
}
