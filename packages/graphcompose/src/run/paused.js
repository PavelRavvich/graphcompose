import { z } from "zod";
/** LangGraph checkpoint thread = the run id (not the conversation thread). */
export const runConfig = (runId, executionContext) => ({
    configurable: { thread_id: runId, executionContext },
});
/** A run with nodes left in its checkpoint is waiting for an approval. */
export async function isWaiting(graph, runId) {
    return (await graph.getState(runConfig(runId))).next.length > 0;
}
/** What the agent's loop asked when it paused (`interrupt` value), checked like stored input. */
const PendingPauseSchema = z.object({
    agent: z.string(),
    callId: z.string(),
    tool: z.string(),
    args: z.unknown(),
    kind: z.enum(["approval", "interactive"]).catch("approval"),
    payload: z.unknown().optional(),
});
/**
 * The agent loop a paused run waits in. The loop is a subgraph run inside its flow node, so its
 * spend lives in its own checkpoint — LangGraph keeps it under the namespace `<node>:<task id>` of
 * the interrupted task — until the agent node finishes; the pending call is the interrupt's value.
 */
export async function pausedLoopOf(graph, checkpointer, runId) {
    const snapshot = await graph.getState(runConfig(runId));
    const task = snapshot.tasks.find((candidate) => candidate.interrupts.length > 0);
    const [asked] = task?.interrupts ?? [];
    if (task === undefined || asked === undefined)
        return undefined;
    const tuple = await checkpointer.getTuple({
        configurable: { thread_id: runId, checkpoint_ns: `${task.name}:${task.id}` },
    });
    if (tuple === undefined)
        return undefined;
    // LangGraph boundary: checkpoint values are untyped; they are the agent loop's own state
    const state = tuple.checkpoint.channel_values;
    return { state, pending: PendingPauseSchema.parse(asked.value) };
}
