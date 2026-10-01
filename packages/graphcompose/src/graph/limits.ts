import { totalCost } from "../finops/usage.js";
import type { FlowModel } from "./check-flow.js";
import type { FlowNodeRef } from "./flow-nodes.js";
import type { FlowStateType } from "./flow-state.js";
import { isWorkingKind } from "./node-kind.js";
import type { WorkflowLimits } from "./settings.js";

/** The boundary key of a limit, as people read it in the workflow file. */
export type LimitKey =
  | "limits.perRun.steps"
  | "limits.perRun.cost"
  | "limits.perDay.cost"
  | `routers.${string}.maxVisits`;

/** What hit a limit: the key, the limit and the value that crossed it. */
export interface LimitBreach {
  readonly key: LimitKey;
  readonly limit: number;
  readonly actual: number;
}

/** A limit was hit — the run **fails** (never a quiet stop), with its path and its spend. */
export class LimitExceededError extends Error {
  override name = "LimitExceededError";
  readonly key: LimitKey;
  readonly limit: number;
  readonly actual: number;
  readonly path: readonly string[];
  readonly spentUsd: number;

  constructor(breach: LimitBreach, path: readonly string[], spentUsd: number) {
    super(
      `Limit ${breach.key} = ${String(breach.limit)} exceeded (${String(breach.actual)}); ` +
        `path: ${path.join(" → ")}; spent $${spentUsd.toFixed(4)}`,
    );
    this.key = breach.key;
    this.limit = breach.limit;
    this.actual = breach.actual;
    this.path = path;
    this.spentUsd = spentUsd;
  }
}

/** The account's day is spent (`limits.perDay.cost`): eval and replay stop there. */
export const isDayCapReached = (error: unknown): boolean =>
  error instanceof LimitExceededError && error.key === "limits.perDay.cost";

/** Limits with defaults applied. */
export interface ResolvedLimits {
  readonly steps: number;
  readonly runCostUsd?: number;
  readonly dayCostUsd?: number;
}

/** Steps per run by default: (agents + routers) × 3. */
export const STEPS_PER_WORKING_NODE = 3;

export function resolveLimits(limits: WorkflowLimits, model: FlowModel): ResolvedLimits {
  const working = [...model.nodes.values()].filter((ref) => isWorkingKind(ref.kind)).length;
  const runCost = limits.perRun?.cost;
  const dayCost = limits.perDay?.cost;
  return {
    steps: limits.perRun?.steps ?? working * STEPS_PER_WORKING_NODE,
    ...(runCost === undefined ? {} : { runCostUsd: runCost }),
    ...(dayCost === undefined ? {} : { dayCostUsd: dayCost }),
  };
}

/** What is checked before a working node runs. */
export interface VisitCheck {
  readonly node: FlowNodeRef;
  readonly limits: ResolvedLimits;
  readonly maxVisits?: number;
  readonly daySpentBeforeRunUsd: number;
}

function breachOf(state: FlowStateType, check: VisitCheck): LimitBreach | undefined {
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
export function checkVisit(state: FlowStateType, check: VisitCheck): void {
  const breach = breachOf(state, check);
  if (breach === undefined) return;
  throw new LimitExceededError(breach, [...state.path, check.node.key], totalCost(state.usage));
}
