import { totalCost } from "../../finops/usage.js";
import type { RouteOption, Router } from "../../routers/index.js";
import { renderRouteInput } from "../contributions.js";
import { FINISH, type AgentStateType, type AgentStateUpdate } from "../state.js";
import type { AsyncNode } from "../types.js";

export interface RouterNodeDeps {
  readonly router: Router;
  readonly options: readonly RouteOption[];
  readonly maxHops: number;
  readonly maxCostUsd: number;
}

/** Guards checked before spending money on a routing call. */
function stopReason(state: AgentStateType, deps: RouterNodeDeps): string | undefined {
  if (state.hops >= deps.maxHops) return "max hops reached";
  if (totalCost(state.usage) >= Math.min(deps.maxCostUsd, state.budgetUsd)) {
    return "budget exhausted";
  }
  return undefined;
}

/** Graph adapter around a Router: renders state, applies guards, maps the outcome to state. */
export function makeRouterNode(deps: RouterNodeDeps): AsyncNode<AgentStateType, AgentStateUpdate> {
  return async (state) => {
    const stop = stopReason(state, deps);
    if (stop !== undefined) return { next: FINISH, routeReason: stop };
    const outcome = await deps.router.route({
      input: renderRouteInput(state.task, state.contributions),
      options: deps.options,
    });
    const usage = outcome.usage === undefined ? [] : [outcome.usage];
    switch (outcome.kind) {
      case "decided":
        return { next: outcome.decision.next, routeReason: outcome.decision.reason, usage };
      case "failed":
        return { next: FINISH, routeReason: outcome.reason, usage };
    }
  };
}
