import type { FlowNodeRef } from "./flow-nodes.js";
import type { FlowStateType, FlowStateUpdate } from "./flow-state.js";
import { checkVisit, type ResolvedLimits } from "./limits.js";
import { isWorkingKind } from "./node-kind.js";
import type { AsyncNode } from "./types.js";

/** What runs one flow node. A node may invoke a compiled subgraph inside (see `subgraphNode`). */
export type FlowNodeRunner = AsyncNode<FlowStateType, FlowStateUpdate>;

/** The workflow's spend today, read once per run (for `limits.perDay.cost`). */
export type SpentToday = () => Promise<number>;

export interface VisitDeps {
  readonly limits: ResolvedLimits;
  readonly spentToday: SpentToday;
  /** A router's `maxVisits`. */
  readonly maxVisits?: number;
}

async function daySpentBeforeRun(state: FlowStateType, deps: VisitDeps): Promise<number> {
  if (state.daySpentBeforeRunUsd !== null) return state.daySpentBeforeRunUsd;
  return deps.limits.dayCostUsd === undefined ? 0 : deps.spentToday();
}

/**
 * Wraps a node's runner with the flow's bookkeeping: every visit is added to the path and the
 * node's visits; a working node (agent, router) is a step — its limits are checked before it runs.
 */
export function visitNode(
  node: FlowNodeRef,
  runner: FlowNodeRunner,
  deps: VisitDeps,
): FlowNodeRunner {
  const visited = { visits: { [node.key]: 1 }, path: [node.key] };
  if (!isWorkingKind(node.kind)) {
    return async (state, config) => ({ ...(await runner(state, config)), ...visited });
  }
  return async (state, config) => {
    const daySpent = await daySpentBeforeRun(state, deps);
    checkVisit(state, {
      node,
      limits: deps.limits,
      daySpentBeforeRunUsd: daySpent,
      ...(deps.maxVisits === undefined ? {} : { maxVisits: deps.maxVisits }),
    });
    const update = await runner(state, config);
    return {
      ...update,
      ...visited,
      steps: 1,
      daySpentBeforeRunUsd: daySpent,
      ...(node.kind === "agent" ? { previousAgent: node.key } : {}),
    };
  };
}
