import { visitAgentAnswer, mergePolicies } from "./judge-points.js";
/** A move without tool calls is the agent's replyWith: `beforeAgentAnswer`, then it leaves the loop. */
export function makeAnswerNode(deps) {
    const agent = deps.agent.name;
    return async (state, config) => {
        const combinedGuardrails = mergePolicies(deps.workflowGuardrails, deps.guardrails);
        const ctx = {
            agent,
            replyWith: typeof state.move?.content === "string" ? state.move.content : (state.move?.text ?? ""),
            runId: config?.configurable?.run_id ?? state.runId,
            metadata: config?.configurable?.metadata ?? {},
        };
        const appState = { runId: state.runId, threadId: state.runId, activeNode: deps.agent.name };
        await visitAgentAnswer(combinedGuardrails, ctx, deps.observer, appState);
        const content = state.move?.content ?? "";
        const isString = typeof content === "string";
        /* v8 ignore next */
        const textReply = isString ? content.trim() : (state.move?.text.trim() ?? "");
        /* v8 ignore next */
        const trimmedContent = isString ? content.trim() : content;
        return {
            messages: state.move === null ? [] : [state.move],
            move: null,
            reply: textReply,
            contributions: [{ agent, content: trimmedContent }],
        };
    };
}
