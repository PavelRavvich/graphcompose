import { HumanMessage } from "@langchain/core/messages";
import { createAgent, toolCallLimitMiddleware } from "langchain";
import { recordToolCost, totalCost, type UsageRecord } from "../../finops/usage.js";
import { systemMessageFor } from "../../llm/cache.js";
import type { ModelBinding } from "../../llm/registry.js";
import { renderAgentInput } from "../../prompts/agents.js";
import { toLangChainTool, type AnyTool, type ToolContext } from "../../tools/index.js";
import { formatContributions } from "../contributions.js";
import { AgentFailedError } from "../errors.js";
import { accountingMiddleware } from "../middleware.js";
import type { AgentStateType, AgentStateUpdate } from "../state.js";
import type { AsyncNode } from "../types.js";

/** Everything needed to run one configured agent. */
export interface AgentDefinition {
  readonly binding: ModelBinding;
  readonly systemPrompt: string;
  readonly tools: readonly AnyTool[];
  readonly maxToolCalls: number;
}

export interface AgentNodeDeps {
  readonly agents: ReadonlyMap<string, AgentDefinition>;
  readonly bundle: string;
  readonly runBudgetCap: number;
}

export class UnknownAgentError extends Error {
  override name = "UnknownAgentError";
  constructor(agent: string) {
    super(`Unknown agent: ${agent}`);
  }
}

/** Per tool: its reported cost lands in the loop's records, next to the model calls. */
function toolContext(
  state: AgentStateType,
  bundle: string,
  tool: AnyTool,
  records: UsageRecord[],
): ToolContext {
  return {
    runId: state.runId,
    bundle,
    agent: state.next,
    signal: new AbortController().signal,
    reportCost: (usd) => {
      records.push(recordToolCost(tool.name, usd));
    },
  };
}

/**
 * Runs the agent the router picked: a model ↔ tool loop (createAgent) with its own model,
 * prompt, thinking and cache settings. Crossing maxToolCalls fails fast; the loop's spend
 * travels with the failure so the ledger still records it.
 */
export function makeAgentNode(deps: AgentNodeDeps): AsyncNode<AgentStateType, AgentStateUpdate> {
  return async (state) => {
    const agent = deps.agents.get(state.next);
    if (agent === undefined) throw new UnknownAgentError(state.next);
    const records: UsageRecord[] = [];
    const loop = createAgent({
      model: agent.binding.model,
      tools: agent.tools.map((tool) =>
        toLangChainTool(tool, toolContext(state, deps.bundle, tool, records)),
      ),
      systemPrompt: systemMessageFor(agent.systemPrompt, agent.binding.settings),
      middleware: [
        accountingMiddleware({
          agent: state.next,
          settings: agent.binding.settings,
          records,
          spentBeforeUsd: totalCost(state.usage),
          budgetUsd: Math.min(deps.runBudgetCap, state.budgetUsd),
        }),
        toolCallLimitMiddleware({ runLimit: agent.maxToolCalls, exitBehavior: "error" }),
      ],
    });
    try {
      const input = renderAgentInput(state.task, formatContributions(state.contributions));
      const result = await loop.invoke({ messages: [new HumanMessage(input)] });
      const content = result.messages.at(-1)?.text.trim() ?? "";
      return { hops: 1, contributions: [{ agent: state.next, content }], usage: records };
    } catch (error) {
      throw new AgentFailedError(state.next, records, error);
    }
  };
}
