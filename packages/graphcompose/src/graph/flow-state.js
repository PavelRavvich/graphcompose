import { Annotation } from "@langchain/langgraph";
import { AgentState } from "./state.js";
const replace = (_previous, next) => next;
const addCounts = (left, right) => {
    const sum = { ...left };
    for (const [name, count] of Object.entries(right))
        sum[name] = (sum[name] ?? 0) + count;
    return sum;
};
const mergeForks = (left, right) => ({
    ...left,
    ...right,
});
/**
 * The state of a flow graph: the agent state the existing nodes work on, plus what the flow engine
 * keeps — the workflow start the run begins at, the previous working node (for `Self`), visits per node,
 * steps per run, the path, and the day's spend when the run started (for `limits.perDay.cost`).
 */
const mergeOptional = (left, right) => Array.from(new Set([...left, ...right]));
export const FlowState = Annotation.Root({
    ...AgentState.spec,
    optionalBranches: Annotation({ reducer: mergeOptional, default: () => [] }),
    /** The workflow start this run begins at (name); may be empty when the flow has one start. */
    start: Annotation({ reducer: replace, default: () => "" }),
    /** The last agent that ran ("" before any) — where `Self` leads. */
    previousAgent: Annotation({ reducer: replace, default: () => "" }),
    /** Visits per node (key) in this run. */
    visits: Annotation({ reducer: addCounts, default: () => ({}) }),
    /** Visits of agents and routers in this run (`limits.perRun.steps`). */
    steps: Annotation({ reducer: (left, right) => left + right, default: () => 0 }),
    /** Every node visited in this run (keys), in order. */
    path: Annotation({ reducer: (left, right) => left.concat(right), default: () => [] }),
    /** The workflow's spend today before this run (read once, at the first working node). */
    daySpentBeforeRunUsd: Annotation({ reducer: replace, default: () => null }),
    /** Accumulated outputs from fork branches. */
    forks: Annotation({
        reducer: mergeForks,
        default: () => ({}),
    }),
    /** The last caught error in the flow. */
    lastError: Annotation({ reducer: replace, default: () => null }),
});
