import { Command } from "@langchain/langgraph";
import type { UsageRecord } from "../finops/usage.js";
import type { FlowGraph } from "../graph/build.js";
import { flowGraphOf } from "../graph/flow-runtime.js";
import type { AgentStateType } from "../graph/state.js";
import type { ToolCallApprovalDecision } from "../dto/standard/framework.js";
import {
  drainRun,
  failedOutcome,
  outcomeError,
  recorder,
  streamConfig,
  workflowAccount,
} from "./execute.js";
import { finishRun } from "./finish.js";
import { isWaiting, pausedLoopOf } from "./paused.js";
import type { AgentRunResult, RunDeps } from "./types.js";
import { runVersions } from "./versions.js";

export class NotPausedError extends Error {
  override name = "NotPausedError";
}

/** The flow graph and the paused agent loop's state of a run that is really waiting for an approval. */
async function pausedRun<TName extends string>(
  paused: AgentRunResult,
  deps: RunDeps<TName>,
): Promise<{ flow: FlowGraph; before: AgentStateType }> {
  const pause = deps.pause;
  if (paused.status !== "paused" || pause === undefined) {
    throw new NotPausedError(`Run ${paused.runId} was not paused or the pause seam is off`);
  }
  const account = workflowAccount(deps);
  const flow = await flowGraphOf(deps, {
    limits: deps.limits,
    spentToday: () => deps.ledger.spentToday(account.key),
  });
  const loop = (await isWaiting(flow.graph, paused.runId))
    ? await pausedLoopOf(flow.graph, pause.checkpointer, paused.runId)
    : undefined;
  if (loop === undefined) {
    throw new NotPausedError(`Run ${paused.runId} is not waiting for an approval`);
  }
  return { flow, before: loop.state };
}

/**
 * Continues a paused run with the approver's decision — same run id, same Tern, same budget. Spend
 * recorded before the pause is not recorded again.
 */
export async function resumeAgent<TName extends string>(
  paused: AgentRunResult,
  decision: ToolCallApprovalDecision,
  deps: RunDeps<TName>,
  options: { readonly signal?: AbortSignal | undefined } = {},
): Promise<AgentRunResult> {
  const { flow, before } = await pausedRun(paused, deps);
  const spent: UsageRecord[] = [];
  const record = recorder(deps, workflowAccount(deps), spent);
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
    const states = await flow.graph.stream(new Command({ resume: decision }), streaming);
    const state = await drainRun(states, record, before.usage.length);
    const context = {
      deps,
      flow,
      base,
      runId: paused.runId,
      budgetUsd: paused.budgetUsd,
      record,
      recorded: Math.max(before.usage.length, state.usage.length),
      callbacks: streaming.callbacks,
    };
    return await finishRun(context, state, paused.ternId);
  } catch (error) {
    const cause = outcomeError(error, options.signal);
    await deps.terns.complete(paused.ternId, failedOutcome(cause, [...before.usage, ...spent]));
    throw cause;
  }
}
