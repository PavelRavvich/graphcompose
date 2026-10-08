/* eslint-disable @typescript-eslint/no-explicit-any */
import { Annotation } from "@langchain/langgraph";
const append = (left, right) => left.concat(right);
const mergeRecords = (left, right) => ({
    ...left,
    ...right,
});
/** Single source of truth for the graph state. Nodes return only the keys they own. */
export const AgentState = Annotation.Root({
    task: Annotation(),
    /** Previous Terns of the thread, oldest first (loaded once per run). */
    history: Annotation({ reducer: (_previous, next) => next, default: () => [] }),
    /** Id of this run (tools and logs). */
    runId: Annotation({ reducer: (_previous, next) => next, default: () => "" }),
    /** The node the last router chose (an agent's name while it runs). */
    next: Annotation(),
    /** Why the last router chose what it chose ("" before any router decided). */
    routeReason: Annotation({ reducer: (_previous, next) => next, default: () => "" }),
    contributions: Annotation({ reducer: append, default: () => [] }),
    /** FinOps: spend allowed for this run (run cap ∩ what is left of the workflow's daily cap). */
    budgetUsd: Annotation({
        reducer: (_previous, next) => next,
        default: () => Number.POSITIVE_INFINITY,
    }),
    /** FinOps: every LLM call appends one record. */
    usage: Annotation({ reducer: append, default: () => [] }),
    replyWith: Annotation(),
    finishes: Annotation({
        reducer: mergeRecords,
        default: () => ({}),
    }),
    /** Conversation memory notes (compaction), oldest first; loaded once per run. */
    summaries: Annotation({ reducer: (_previous, next) => next, default: () => [] }),
    /** The approval decisions on tool calls in this run. */
    approvals: Annotation({ reducer: append, default: () => [] }),
    /** Name of the guard that stopped the run, "" if none. */
    guarded: Annotation({ reducer: (_previous, next) => next, default: () => "" }),
    /** Custom developer KV data aggregated across workflow. */
    payload: Annotation({ reducer: mergeRecords, default: () => ({}) }),
    /** System cursor for batchParallel loop elements. */
    batchItem: Annotation({ reducer: (p, n) => n }),
    _batchCursor: Annotation({
        reducer: mergeRecords,
        default: () => ({}),
    }),
});
