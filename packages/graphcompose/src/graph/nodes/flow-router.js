import { formatMemory, renderRouteInput } from "../contributions.js";
import { PaidStepError } from "../errors.js";
import { SELF_OPTION } from "../route.js";
import { normalisePromptText } from "../text.js";
/** Why a router sent the turn to its workflow finish without asking its model (#100). */
export const AFTER_APPROVAL_DECISION = "the agent answered after the approval decision";
/** A router could not routeTo — the run fails (no guessing); its spend is kept. */
export class RouterDecisionError extends PaidStepError {
  name = "RouterDecisionError";
  code;
  router;
  constructor(router, code, reason, usage) {
    super(`Router "${router}" [${code}]: ${reason}`, usage, undefined);
    this.code = code;
    this.router = router;
  }
}
async function resolvePrompt(input, state) {
  return normalisePromptText(await input(state));
}
/** Routes in canonical order (already sorted at load) as the router's options. */
export async function routeRequestOf(state, deps) {
  const instructions = await resolvePrompt(deps.loaded.instructions, state);
  const options = await Promise.all(
    deps.loaded.routes.map(async (item) => ({
      name: item.option,
      description: await resolvePrompt(item.condition, state),
    })),
  );
  return {
    input: renderRouteInput(state.task, state.contributions, formatMemory(state, deps.memory)),
    options,
    instructions,
  };
}
/** The node the router chose: a route's target, or for `Self` the previous agent. */
function targetOf(outcome, state, deps, usage) {
  const { next } = outcome.decision;
  const fail = (code, reason) => {
    throw new RouterDecisionError(deps.loaded.name, code, reason, usage);
  };
  const route = deps.loaded.routes.find((item) => item.option === next);
  if (!route) {
    return fail("router.unknown-route", `"${next}" is not one of its routes`);
  }
  if (next !== SELF_OPTION) return { next, optionalBranches: route.optionalBranches || [] };
  return state.previousAgent === ""
    ? fail("router.failed", "Self, but no agent ran yet")
    : { next: state.previousAgent, optionalBranches: [] };
}
export function makeFlowRouterNode(deps) {
  return async (state) => {
    // a call was decided in this turn and the agent has answered since — the turn ends (#100)
    if (state.approvals.length > 0 && deps.finish !== undefined) {
      return { next: deps.finish, routeReason: AFTER_APPROVAL_DECISION };
    }
    const appState = {
      runId: state.runId,
      threadId: state.runId,
      activeNode: deps.loaded.name,
      variables: {},
      history: state.history,
    };
    await deps.observer?.onRouterStart({
      name: deps.loaded.name,
      input: state.task,
      state: appState,
    });
    const request = await routeRequestOf(state, deps);
    const outcome = await deps.router.route(request);
    const usage = outcome.usage === undefined ? [] : [outcome.usage];
    if (outcome.kind === "failed") {
      const code = outcome.unknownOption === undefined ? "router.failed" : "router.unknown-route";
      throw new RouterDecisionError(deps.loaded.name, code, outcome.reason, usage);
    }
    const target = targetOf(outcome, state, deps, usage);
    const result = {
      next: target.next,
      optionalBranches: target.optionalBranches,
      routeReason: outcome.decision.reason,
      usage,
    };
    await deps.observer?.onRouterEnd({ name: deps.loaded.name, update: result, state: appState });
    return result;
  };
}
