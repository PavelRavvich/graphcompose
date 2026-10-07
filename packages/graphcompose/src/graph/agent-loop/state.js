import { Annotation } from "@langchain/langgraph";
import { FlowState } from "../flow-state.js";
const append = (left, right) => left.concat(right);
const replace = (_previous, next) => next;
const add = (left, right) => left + right;
const merge = (left, right) => ({ ...left, ...right });
const NOTHING_HANDED_OVER = { contributions: 0, usage: 0, approvals: 0 };
/**
 * The state of one agent's loop (its subgraph): the flow's agent state it was handed, plus the
 * conversation with the model, the move under way, finished calls and decisions by call id, and the
 * counters its limits check. Checkpointed node by node — each tool call is its own task.
 */
export const AgentLoopState = Annotation.Root({
    ...FlowState.spec,
    /** The flow nodes visited up to and including this agent (limit errors name it). */
    flowPath: Annotation({ reducer: replace, default: () => [] }),
    /** Where this loop's additions start in the lists it was handed. */
    from: Annotation({ reducer: replace, default: () => NOTHING_HANDED_OVER }),
    /** The conversation the model sees (the system prompt is added per call). */
    messages: Annotation({ reducer: append, default: () => [] }),
    /** The model's last move while its tool calls are judged, approved and run. */
    move: Annotation({ reducer: replace, default: () => null }),
    results: Annotation({ reducer: merge, default: () => ({}) }),
    decisions: Annotation({ reducer: merge, default: () => ({}) }),
    modelCalls: Annotation({ reducer: add, default: () => 0 }),
    toolCalls: Annotation({ reducer: add, default: () => 0 }),
    /** The agent's answer; null while it is still working. */
    reply: Annotation({ reducer: replace, default: () => null }),
});
/** What this loop spent so far (not in the flow's state until the agent answers). */
export const loopUsage = (state) => state.usage.slice(state.from.usage);
export const LOOP_NODE = {
    input: "input",
    model: "model",
    boundary: "boundary",
    approval: "approval",
    tool: "tool",
    collect: "collect",
    answer: "agent-answer",
};
