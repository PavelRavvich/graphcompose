import { totalCost } from "../../finops/usage.js";
import type { RouteOption, Router } from "../../routers/index.js";
import { formatHistory, renderRouteInput } from "../contributions.js";
import { FINISH, type AgentStateType, type AgentStateUpdate } from "../state.js";
import type { AsyncNode } from "../types.js";

export interface RouterNodeDeps {
  readonly router: Router;
  readonly options: readonly RouteOption[];
  readonly maxHops: number;
  readonly maxCostUsd: number;
  readonly historyLimit: number;
}

/** Guards checked before spending money on a routing call. */
function stopReason(state: AgentStateType, deps: RouterNodeDeps): string | undefined {
  if (state.hops >= deps.maxHops) return "max hops reached";
  if (totalCost(state.usage) >= Math.min(deps.maxCostUsd, state.budgetUsd)) {
    return "budget exhausted";
  }
  return undefined;
}

/** Nobody has answered yet: `finish` is not an option, the first hop always goes to an agent. */
function optionsFor(state: AgentStateType, deps: RouterNodeDeps): RouterNodeDeps["options"] {
  if (state.contributions.length > 0) return deps.options;
  return deps.options.filter((option) => option.name !== FINISH);
}

/** Graph adapter around a Router: renders state, applies guards, maps the outcome to state. */
export function makeRouterNode(deps: RouterNodeDeps): AsyncNode<AgentStateType, AgentStateUpdate> {
  return async (state) => {
    const stop = stopReason(state, deps);
    if (stop !== undefined) return { next: FINISH, routeReason: stop };
    const outcome = await deps.router.route({
      input: renderRouteInput(
        state.task,
        state.contributions,
        formatHistory(state.history, deps.historyLimit),
      ),
      options: optionsFor(state, deps),
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
