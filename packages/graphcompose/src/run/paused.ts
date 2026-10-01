import type { BaseCheckpointSaver } from "@langchain/langgraph";
import type { CompiledFlowGraph } from "../graph/build.js";
import type { AgentStateType } from "../graph/state.js";

/** LangGraph checkpoint thread = the run id (not the conversation thread). */
export const runConfig = (runId: string): { configurable: { thread_id: string } } => ({
  configurable: { thread_id: runId },
});

/** A run with nodes left in its checkpoint is waiting for an approval. */
export async function isWaiting(graph: CompiledFlowGraph, runId: string): Promise<boolean> {
  return (await graph.getState(runConfig(runId))).next.length > 0;
}

/**
 * The state of the agent loop a paused run waits in. The loop is a subgraph run inside its flow node,
 * so its spend and the pending call live in its own checkpoint — LangGraph keeps it under the
 * namespace `<node>:<task id>` of the interrupted task — until the agent node finishes.
 */
export async function pausedLoopState(
  graph: CompiledFlowGraph,
  checkpointer: BaseCheckpointSaver,
  runId: string,
): Promise<AgentStateType | undefined> {
  const snapshot = await graph.getState(runConfig(runId));
  const task = snapshot.tasks.find((candidate) => candidate.interrupts.length > 0);
  if (task === undefined) return undefined;
  const tuple = await checkpointer.getTuple({
    configurable: { thread_id: runId, checkpoint_ns: `${task.name}:${task.id}` },
  });
  // LangGraph boundary: checkpoint values are untyped; they are the agent loop's own state.
  return tuple?.checkpoint.channel_values as AgentStateType | undefined;
}
