import { FINISH, type AgentStateType } from "./state.js";

export const ROUTER_NODE = "router";
export const AGENT_NODE = "agent";
export const FINALIZE_NODE = "finalize";

export type RouterTarget = typeof AGENT_NODE | typeof FINALIZE_NODE;

/** Conditional edge after the router: pure function of state. */
export function routeAfterRouter(state: Pick<AgentStateType, "next">): RouterTarget {
  return state.next === FINISH ? FINALIZE_NODE : AGENT_NODE;
}
