import type { UsageRecord } from "../../finops/usage.js";
import type { RouteOutcome, RouteRequest, Router } from "../../routers/index.js";
import { formatMemory, renderRouteInput } from "../contributions.js";
import { PaidStepError } from "../errors.js";
import type { FlowStateType, FlowStateUpdate } from "../flow-state.js";
import { SELF_OPTION } from "../route.js";
import type { LoadedRouter } from "../router-texts.js";
import type { AsyncNode } from "../types.js";

/** How much of the thread's memory a router sees. */
export interface MemoryLimits {
  readonly summaries: number;
  readonly turns: number;
}

export interface FlowRouterNodeDeps {
  readonly router: Router;
  readonly loaded: LoadedRouter;
  readonly memory: MemoryLimits;
  /** The router's route to a workflow finish, if it has one: taken without a call after a human decision. */
  readonly finish?: string;
}

/** Why a router sent the turn to its workflow finish without asking its model (#100). */
export const AFTER_HUMAN_DECISION = "the agent answered after the human decision";

/** Why a router could not decide: its model call failed, or it chose something that is not a route. */
export type RouterFailureCode = "router.failed" | "router.unknown-route";

/** A router could not decide — the run fails (no guessing); its spend is kept. */
export class RouterDecisionError extends PaidStepError {
  override name = "RouterDecisionError";
  readonly code: RouterFailureCode;
  readonly router: string;

  constructor(
    router: string,
    code: RouterFailureCode,
    reason: string,
    usage: readonly UsageRecord[],
  ) {
    super(`Router "${router}" [${code}]: ${reason}`, usage, undefined);
    this.code = code;
    this.router = router;
  }
}

/** Routes in canonical order (already sorted at load) as the router's options. */
export function routeRequestOf(state: FlowStateType, deps: FlowRouterNodeDeps): RouteRequest {
  return {
    input: renderRouteInput(state.task, state.contributions, formatMemory(state, deps.memory)),
    options: deps.loaded.routes.map((item) => ({ name: item.option, description: item.text })),
    instructions: deps.loaded.instructions,
  };
}

/** The node the router chose: a route's target, or for `Self` the previous agent. */
function targetOf(
  outcome: Extract<RouteOutcome, { kind: "decided" }>,
  state: FlowStateType,
  deps: FlowRouterNodeDeps,
  usage: readonly UsageRecord[],
): string {
  const { next } = outcome.decision;
  const fail = (code: RouterFailureCode, reason: string): never => {
    throw new RouterDecisionError(deps.loaded.name, code, reason, usage);
  };
  if (!deps.loaded.routes.some((item) => item.option === next)) {
    return fail("router.unknown-route", `"${next}" is not one of its routes`);
  }
  if (next !== SELF_OPTION) return next;
  return state.previousAgent === ""
    ? fail("router.failed", "Self, but no agent ran yet")
    : state.previousAgent;
}

/** A flow router: asks the router's model, fails the run on any failure, sets `next` to the target. */
export function makeFlowRouterNode(
  deps: FlowRouterNodeDeps,
): AsyncNode<FlowStateType, FlowStateUpdate> {
  return async (state) => {
    // a human decided in this turn and the agent has answered since — the turn ends (#100)
    if (state.approvals.length > 0 && deps.finish !== undefined) {
      return { next: deps.finish, routeReason: AFTER_HUMAN_DECISION };
    }
    const outcome = await deps.router.route(routeRequestOf(state, deps));
    const usage = outcome.usage === undefined ? [] : [outcome.usage];
    if (outcome.kind === "failed") {
      const code = outcome.unknownOption === undefined ? "router.failed" : "router.unknown-route";
      throw new RouterDecisionError(deps.loaded.name, code, outcome.reason, usage);
    }
    const next = targetOf(outcome, state, deps, usage);
    return { next, routeReason: outcome.decision.reason, usage };
  };
}
