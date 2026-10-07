import { awaitingApproval } from "./boundary.js";
import { toolNamed } from "./deps.js";
import { JudgePoint, visitToolThenAgent, mergePolicies } from "./judge-points.js";
/** One sentence on what the call will do (the ask's `summary`). */
const summaryOf = (tool, args) => `call ${tool} with ${JSON.stringify(args)}`;
/**
 * Asks about ONE call — the first that waits — and records the decision by its call id. Nothing
 * happens before the ask, so running this node again on resume repeats nothing; the next waiting
 * call gets its own pause.
 */
export function makeApprovalNode(deps) {
    return async (state, config) => {
        const appState = { runId: state.runId, threadId: state.runId, activeNode: deps.agent.name };
        const [call] = awaitingApproval(state, deps);
        if (call === undefined || deps.approval === undefined)
            return {};
        const tool = toolNamed(deps.agent, call.tool);
        if (!tool || !tool.channel)
            return {};
        const metadata = config?.configurable?.metadata ?? {};
        const decision = await deps.approval.requestApproval({
            callId: call.callId,
            tool: call.tool,
            arguments: call.args,
            summary: summaryOf(call.tool, call.args),
        }, deps.agent.name, tool, state.runId, metadata);
        let feedback = decision.feedback;
        let overrideArgs = decision.overrideArguments;
        const combinedPii = mergePolicies(deps.workflowPiiPolicies, deps.piiPolicies, deps.toolPiiPolicies?.(call.tool));
        for (const policy of combinedPii) {
            const pName = policy.constructor.name || "UnknownPiiPolicy";
            await deps.observer?.onPiiPolicyStart({
                name: pName,
                input: { feedback, overrideArgs },
                state: appState,
            });
            if (feedback !== undefined && typeof policy.mask === "function") {
                feedback = await policy.mask(feedback);
            }
            if (overrideArgs !== undefined && typeof policy.maskJson === "function") {
                overrideArgs = await policy.maskJson(overrideArgs);
            }
            await deps.observer?.onPiiPolicyEnd({
                name: pName,
                update: { feedback, overrideArgs },
                state: appState,
            });
        }
        const recorded = feedback === undefined
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
        const combinedGuardrails = mergePolicies(deps.workflowGuardrails, deps.guardrails, deps.toolGuardrails?.(call.tool));
        const ctx = {
            agent: deps.agent.name,
            call,
            runId: config?.configurable?.run_id ?? state.runId,
            metadata: config?.configurable?.metadata ?? {},
        };
        await visitToolThenAgent(combinedGuardrails, JudgePoint.OnChannelDecision, ctx, recorded, deps.observer, appState);
        return { decisions: { [call.callId]: recorded } };
    };
}
