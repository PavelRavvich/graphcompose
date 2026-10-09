import type { AsyncNode } from "../types.js";
import { awaitingApproval } from "./boundary.js";
import { toolNamed } from "./deps.js";
import type { AgentLoopDeps } from "./deps.js";
import type { AgentLoopStateType, AgentLoopUpdate } from "./state.js";
import { JudgePoint, visitToolThenAgent, mergePolicies } from "./judge-points.js";

/** One sentence on what the call will do (the ask's `summary`). */
const summaryOf = (tool: string, args: Record<string, unknown>): string =>
  `call ${tool} with ${JSON.stringify(args)}`;

/**
 * Asks about ONE call — the first that waits — and records the decision by its call id. Nothing
 * happens before the ask, so running this node again on resume repeats nothing; the next waiting
 * call gets its own pause.
 */
// eslint-disable-next-line max-lines-per-function
export function makeApprovalNode(
  deps: AgentLoopDeps,
): AsyncNode<AgentLoopStateType, AgentLoopUpdate> {
  // eslint-disable-next-line max-lines-per-function, complexity
  return async (state, config) => {
    const appState = { runId: state.runId, threadId: state.runId, activeNode: deps.agent.name };
    /* v8 ignore next 4 */
    const [call] = awaitingApproval(state, deps);
    if (call === undefined || deps.approval === undefined) return {};
    const tool = toolNamed(deps.agent, call.tool);
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    if (!tool || !tool.channel) return {};
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const metadata = config?.configurable?.metadata ?? {};

    const decision = await deps.approval.requestApproval(
      {
        callId: call.callId,
        tool: call.tool,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        arguments: call.args as Record<string, unknown>,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        summary: summaryOf(call.tool, call.args as Record<string, unknown>),
      },
      deps.agent.name,
      tool,
      state.runId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      metadata,
      config?.configurable?.executionContext,
    );
    let feedback = decision.feedback;
    let overrideArgs = decision.overrideArguments;
    const combinedPii = mergePolicies(
      /* v8 ignore start */
      deps.workflowPiiPolicies,
      deps.piiPolicies,
      deps.toolPiiPolicies?.(call.tool),
    );

    for (const policy of combinedPii) {
      /* v8 ignore stop */
      /* v8 ignore start */
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/prefer-nullish-coalescing
      const pName = policy.constructor.name || "UnknownPiiPolicy";
      await deps.observer?.onPiiPolicyStart({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        name: pName,
        input: { feedback, overrideArgs },
        state: appState,
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (feedback !== undefined && typeof policy.mask === "function") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        feedback = await policy.mask(feedback);
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (overrideArgs !== undefined && typeof policy.maskJson === "function") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        overrideArgs = await policy.maskJson(overrideArgs);
      }
      await deps.observer?.onPiiPolicyEnd({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        name: pName,
        update: { feedback, overrideArgs },
        state: appState,
      });
    }
    /* v8 ignore stop */

    const recorded =
      feedback === undefined
        ? {
            approved: decision.approved,
            by: decision.by,
            overrideArguments: overrideArgs,
          }
        : {
            approved: decision.approved,
            by: decision.by,
            feedback: feedback,
            overrideArguments: overrideArgs,
          };
    const combinedGuardrails = mergePolicies(
      deps.workflowGuardrails,
      deps.guardrails,
      deps.toolGuardrails?.(call.tool),
    );
    const ctx = {
      agent: deps.agent.name,
      call,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      runId: config?.configurable?.run_id ?? state.runId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      metadata: config?.configurable?.metadata ?? {},
    };
    await visitToolThenAgent(
      combinedGuardrails,
      JudgePoint.OnChannelDecision,
      ctx,
      recorded,
      deps.observer,
      appState,
    );
    return { decisions: { [call.callId]: recorded } };
  };
}
