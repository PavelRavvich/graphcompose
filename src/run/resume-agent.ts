import { Command } from "@langchain/langgraph";
import type { UsageRecord } from "../finops/usage.js";
import { buildGraph } from "../graph/graph.js";
import type { AgentStateType } from "../graph/state.js";
import type { ApprovalDecision } from "../pause/index.js";
import { drainRun, failedOutcome, finishRun, recorder, runConfig } from "./execute.js";
import type { AgentRunResult, RunDeps } from "./types.js";
import { runVersions } from "./versions.js";

export class NotPausedError extends Error {
  override name = "NotPausedError";
}

/**
 * Continues a paused run with a human's decision — same run id, same Tern, same budget. Spend
 * recorded before the pause is not recorded again.
 */
export async function resumeAgent<TName extends string>(
  paused: AgentRunResult,
  decision: ApprovalDecision,
  deps: RunDeps<TName>,
): Promise<AgentRunResult> {
  if (paused.status !== "paused" || deps.pause === undefined) {
    throw new NotPausedError(`Run ${paused.runId} was not paused or the pause seam is off`);
  }
  const graph = buildGraph(deps);
  const config = runConfig(paused.runId);
  const snapshot = await graph.getState(config);
  if (snapshot.next.length === 0) {
    throw new NotPausedError(`Run ${paused.runId} is not waiting for a human`);
  }
  // LangGraph boundary: checkpoint values are untyped; they are this graph's own state.
  const before = snapshot.values as AgentStateType;
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
    const states = await graph.stream(new Command({ resume: decision }), {
      ...config,
      streamMode: "values",
    });
    const state = await drainRun(states, record, before.usage.length);
    return await finishRun(
      { deps, graph, base, runId: paused.runId, budgetUsd: paused.budgetUsd },
      state,
      paused.ternId,
    );
  } catch (error) {
    await deps.terns.complete(paused.ternId, failedOutcome(error, [...before.usage, ...spent]));
    throw error;
  }
}
