import { QuorumManager } from "../concurrency/quorum-manager.js";
import { randomUUID } from "node:crypto";
import type { UsageRecord } from "../finops/usage.js";
import type { FlowModel } from "../graph/check-flow.js";
import { workflowStartMetaOf } from "../graph/workflow-start.decorator.js";
import { flowGraphOf } from "../graph/flow-runtime.js";
import { WorkflowStartText } from "../dto/standard/framework.js";
import { RunInputSchema } from "../input.js";
import {
  allowedBudget,
  drainRun,
  failedOutcome,
  outcomeError,
  recorder,
  streamConfig,
  workflowAccount,
  type TernBase,
} from "./execute.js";
import { inRunScope } from "../components/run-scope.js";
import { finishRun } from "./finish.js";
import { openThread } from "./thread.js";
import type { AgentExecutionOutput, RunDeps, RunOptions } from "./types.js";
import { runVersions } from "./versions.js";

/** The workflow start a task goes to: the one asked for, else the text start (input `WorkflowStartText`). */
function startFor(model: FlowModel, requested: string | undefined): string {
  if (requested !== undefined) return requested;
  const starts = [...model.nodes.values()].filter((ref) => ref.kind === "workflow-start");
  const text = starts.find((ref) => workflowStartMetaOf(ref.use)?.input === WorkflowStartText);
  return (text ?? starts[0])?.name ?? "";
}

/**
 * Public entry point: validates input, opens or continues a thread, checks the daily cap (nothing
 * left → no calls), runs the flow within the workflow's limits, records spend as it happens and
 * writes a Tern for every outcome — answered, guarded, paused or failed (a limit, a router).
 * The run has its own run-scoped components (`scope: "run"`), destroyed when it ends.
 */
export function runAgent<TName extends string>(
  input: unknown,
  deps: RunDeps<TName>,
  options: RunOptions = {},
): Promise<AgentExecutionOutput> {
  return inRunScope(() => runOnce(input, deps, options));
}

async function runOnce<TName extends string>(
  input: unknown,
  deps: RunDeps<TName>,
  options: RunOptions,
): Promise<AgentExecutionOutput> {
  const { task, threadId: requested, start } = RunInputSchema.parse(input);
  const account = options.account ?? workflowAccount(deps);
  const { threadId, history, summaries } = await openThread(deps, requested);
  const spent: UsageRecord[] = [];
  const base: TernBase = {
    threadId,
    bundle: deps.config.name,
    task,
    replayOf: options.replayOf ?? null,
    ...runVersions(deps),
  };
  try {
    const { budgetUsd, run } = await allowedBudget(deps, account);
    const runId = deps.newRunId?.() ?? randomUUID();
    const flow = await flowGraphOf(deps, run);
    const config = streamConfig(deps, { threadId, runId }, options);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    (config.configurable as any).quorumManager = new QuorumManager();
    const record = recorder(deps, account, spent);
    const initial = {
      task,
      budgetUsd,
      history,
      summaries,
      runId,
      start: startFor(flow.model, start),
    };
    const state = await drainRun(await flow.graph.stream(initial, config), record);
    const recorded = state.usage.length;
    const context = { deps, flow, base, runId, budgetUsd, record, recorded };
    return await finishRun({ ...context, callbacks: config.callbacks }, state);
  } catch (error) {
    const cause = outcomeError(error, options.signal);
    await deps.terns.append({ ...base, ...failedOutcome(cause, spent) });
    throw cause;
  }
}
