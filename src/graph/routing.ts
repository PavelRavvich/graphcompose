import { END } from "@langchain/langgraph";
import { FINISH, type AgentStateType } from "./state.js";

export const ROUTER_NODE = "router";
export const AGENT_NODE = "agent";
export const FINALIZE_NODE = "finalize";
export const INPUT_GUARDS_NODE = "input_guards";
export const OUTPUT_GUARDS_NODE = "output_guards";

/** After input guards: a tripped guard ends the run before any agent spends money. */
export function routeAfterInputGuards(
  state: Pick<AgentStateType, "guarded">,
): typeof ROUTER_NODE | typeof END {
  return state.guarded === "" ? ROUTER_NODE : END;
}

export type RouterTarget = typeof AGENT_NODE | typeof FINALIZE_NODE;

/** Conditional edge after the router: pure function of state. */
export function routeAfterRouter(state: Pick<AgentStateType, "next">): RouterTarget {
  return state.next === FINISH ? FINALIZE_NODE : AGENT_NODE;
}
