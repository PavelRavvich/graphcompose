import { AIMessage } from "@langchain/core/messages";
import { createMiddleware, type AgentMiddleware } from "langchain";
import type { ResolvedModelSettings } from "../config/types.js";
import { recordUsage, totalCost, type UsageRecord } from "../finops/usage.js";
import { BUDGET_STOP_MESSAGE } from "../prompts/agents.js";

export interface AccountingDeps {
  readonly agent: string;
  readonly settings: ResolvedModelSettings;
  /** The loop's records; also read by the node after the loop or on failure. */
  readonly records: UsageRecord[];
  /** Spent in this run before the agent started. */
  readonly spentBeforeUsd: number;
  readonly budgetUsd: number;
}

/**
 * Around every model call of an agent loop: stops the loop when the run budget is spent (no
 * call made) and records the usage of every call that happened.
 */
export function accountingMiddleware(deps: AccountingDeps): AgentMiddleware {
  return createMiddleware({
    name: "Accounting",
    wrapModelCall: async (request, handler) => {
      if (deps.spentBeforeUsd + totalCost(deps.records) >= deps.budgetUsd) {
        return new AIMessage(BUDGET_STOP_MESSAGE);
      }
      const response = await handler(request);
      deps.records.push(recordUsage(deps.agent, deps.settings, response));
      return response;
    },
  });
}
