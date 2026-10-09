import { totalCost } from "../finops/usage.js";
import { isWorkingKind } from "./node-kind.js";
/**
 * A limit was hit — the run **fails** (never a quiet stop), with its path and its spend. `usage` is
 * spend the run's state does not hold yet (an agent's loop stopped midway), so the ledger still sees it.
 */
export class LimitExceededError extends Error {
  name = "LimitExceededError";
  key;
  limit;
  actual;
  path;
  spentUsd;
  usage;
  constructor(breach, path, spentUsd, usage = []) {
    super(
      `Limit ${breach.key} = ${String(breach.limit)} exceeded (${String(breach.actual)}); ` +
        `path: ${path.join(" → ")}; spent $${spentUsd.toFixed(4)}`,
    );
    this.key = breach.key;
    this.limit = breach.limit;
    this.actual = breach.actual;
    this.path = path;
    this.spentUsd = spentUsd;
    this.usage = usage;
  }
}
/** The account's day is spent (`limits.perDay.cost`): eval and replay stop there. */
export const isDayCapReached = (error) =>
  error instanceof LimitExceededError && error.key === "limits.perDay.cost";
/** Steps per run by default: (agents + routers) × 3. */
export const STEPS_PER_WORKING_NODE = 3;
export function resolveLimits(limits, model) {
  const working = [...model.nodes.values()].filter((ref) => isWorkingKind(ref.kind)).length;
  const runCost = limits.perRun?.cost;
  const dayCost = limits.perDay?.cost;
  return {
    steps: limits.perRun?.steps ?? working * STEPS_PER_WORKING_NODE,
    ...(runCost === undefined ? {} : { runCostUsd: runCost }),
    ...(dayCost === undefined ? {} : { dayCostUsd: dayCost }),
  };
}
function breachOf(state, check) {
  const { limits, node } = check;
  const steps = state.steps + 1;
  if (steps > limits.steps)
    return { key: "limits.perRun.steps", limit: limits.steps, actual: steps };
  const visits = (state.visits[node.key] ?? 0) + 1;
  if (check.maxVisits !== undefined && visits > check.maxVisits) {
    return { key: `routers.${node.name}.maxVisits`, limit: check.maxVisits, actual: visits };
  }
  const spent = totalCost(state.usage);
  if (limits.runCostUsd !== undefined && spent >= limits.runCostUsd) {
    return { key: "limits.perRun.cost", limit: limits.runCostUsd, actual: spent };
  }
  const today = check.daySpentBeforeRunUsd + spent;
  if (limits.dayCostUsd !== undefined && today >= limits.dayCostUsd) {
    return { key: "limits.perDay.cost", limit: limits.dayCostUsd, actual: today };
  }
  return undefined;
}
/** Throws `LimitExceededError` when visiting this working node would cross a limit. */
export function checkVisit(state, check) {
  const breach = breachOf(state, check);
  if (breach === undefined) return;
  throw new LimitExceededError(breach, [...state.path, check.node.key], totalCost(state.usage));
}
