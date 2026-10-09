import { totalCost } from "../../finops/usage.js";
import { LimitExceededError } from "../limits.js";
import { loopUsage } from "./state.js";
export const DEFAULT_AGENT_LIMITS = { modelCalls: 12, toolCalls: 20 };
/**
 * Until `@Agent({ limits })` (#152): `toolCalls` comes from `maxToolCalls` — the agent's own, else
 * `defaults.tools.maxToolCalls` — when set; everything else is the default.
 */
export function resolveAgentLimits(agentMaxToolCalls, defaultMaxToolCalls) {
  const toolCalls = agentMaxToolCalls ?? defaultMaxToolCalls;
  return {
    limits: { ...DEFAULT_AGENT_LIMITS, ...(toolCalls === undefined ? {} : { toolCalls }) },
    defaulted: toolCalls === undefined ? ["modelCalls", "toolCalls"] : ["modelCalls"],
  };
}
/** Fails the run at an agent limit; the loop's spend so far travels with the error to the ledger. */
export function agentLimitError(state, breach) {
  const usage = [...loopUsage(state), ...breach.spent];
  return new LimitExceededError(
    {
      key: `agents.${breach.agent}.limits.${breach.limit}`,
      limit: breach.max,
      actual: breach.actual,
    },
    state.flowPath,
    totalCost(state.usage) + totalCost(breach.spent),
    usage,
  );
}
