import { Command } from "@langchain/langgraph";
import type { UsageRecord } from "../finops/usage.js";
import { buildGraph } from "../graph/graph.js";
import type { AgentStateType } from "../graph/state.js";
import type { ApprovalDecision } from "../pause/index.js";
import {
  drainRun,
  failedOutcome,
  outcomeError,
  finishRun,
  recorder,
  runConfig,
  streamConfig,
} from "./execute.js";
import type { AgentRunResult, RunDeps } from "./types.js";
import { runVersions } from "./versions.js";

export class NotPausedError extends Error {
  override name = "NotPausedError";
}

/** The graph and the checkpointed state of a run that is really waiting for a human. */
async function pausedRun<TName extends string>(
  paused: AgentRunResult,
  deps: RunDeps<TName>,
): Promise<{ graph: ReturnType<typeof buildGraph>; before: AgentStateType }> {
  if (paused.status !== "paused" || deps.pause === undefined) {
    throw new NotPausedError(`Run ${paused.runId} was not paused or the pause seam is off`);
  }
  const graph = buildGraph(deps);
  const snapshot = await graph.getState(runConfig(paused.runId));
  if (snapshot.next.length === 0) {
    throw new NotPausedError(`Run ${paused.runId} is not waiting for a human`);
  }
  // LangGraph boundary: checkpoint values are untyped; they are this graph's own state.
  return { graph, before: snapshot.values as AgentStateType };
}

/**
 * Continues a paused run with a human's decision — same run id, same Tern, same budget. Spend
 * recorded before the pause is not recorded again.
 */
export async function resumeAgent<TName extends string>(
  paused: AgentRunResult,
  decision: ApprovalDecision,
  deps: RunDeps<TName>,
  options: { readonly signal?: AbortSignal | undefined } = {},
): Promise<AgentRunResult> {
  const { graph, before } = await pausedRun(paused, deps);
  const spent: UsageRecord[] = [];
  const record = recorder(
    deps,
    { key: deps.config.name, dailyCap: deps.config.budget.dailyBudgetCap },
    spent,
  );
  const base = {
    threadId: paused.threadId,
    bundle: deps.config.name,
    task: before.task,
    replayOf: null,
    ...runVersions(deps),
  };
  try {
    const streaming = streamConfig(
      deps,
      { threadId: paused.threadId, runId: paused.runId },
      options.signal,
    );
    const states = await graph.stream(new Command({ resume: decision }), streaming);
    const state = await drainRun(states, record, before.usage.length);
    const context = {
      deps,
      graph,
      base,
      runId: paused.runId,
      budgetUsd: paused.budgetUsd,
      record,
      callbacks: streaming.callbacks,
    };
    return await finishRun(context, state, paused.ternId);
  } catch (error) {
    const cause = outcomeError(error, options.signal);
    await deps.terns.complete(paused.ternId, failedOutcome(cause, [...before.usage, ...spent]));
    throw cause;
  }
}
