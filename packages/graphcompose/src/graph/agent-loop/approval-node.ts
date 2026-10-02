import type { AsyncNode } from "../types.js";
import { awaitingApproval } from "./boundary.js";
import type { AgentLoopDeps } from "./deps.js";
import type { AgentLoopStateType, AgentLoopUpdate } from "./state.js";

/** One sentence on what the call will do (the ask's `summary`). */
const summaryOf = (tool: string, args: Record<string, unknown>): string =>
  `call ${tool} with ${JSON.stringify(args)}`;

/**
 * Asks about ONE call — the first that waits — and records the decision by its call id. Nothing
 * happens before the ask, so running this node again on resume repeats nothing; the next waiting
 * call gets its own pause.
 */
export function makeApprovalNode(
  deps: AgentLoopDeps,
): AsyncNode<AgentLoopStateType, AgentLoopUpdate> {
  return async (state) => {
    const [call] = awaitingApproval(state, deps);
    if (call === undefined || deps.approval === undefined) return {};
    const decision = await deps.approval.requestApproval(
      {
        callId: call.callId,
        tool: call.tool,
        arguments: call.args,
        summary: summaryOf(call.tool, call.args),
      },
      deps.agent.name,
    );
    const recorded =
      decision.reason === undefined
        ? { approved: decision.approved, by: decision.by }
        : { approved: decision.approved, by: decision.by, reason: decision.reason };
    return { decisions: { [call.callId]: recorded } };
  };
}
