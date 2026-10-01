import { randomUUID } from "node:crypto";
import type { UsageRecord } from "../finops/usage.js";
import type { FlowModel } from "../graph/check-flow.js";
import { entryMetaOf } from "../graph/entry.decorator.js";
import { flowGraphOf } from "../graph/flow-runtime.js";
import { ChatMessage } from "../dto/standard/framework.js";
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
import { finishRun } from "./finish.js";
import { openThread } from "./thread.js";
import type { AgentRunResult, RunDeps, RunOptions } from "./types.js";
import { runVersions } from "./versions.js";

/** The entry a task goes to: the one asked for, else the workflow's chat entry (input `ChatMessage`). */
function entryFor(model: FlowModel, requested: string | undefined): string {
  if (requested !== undefined) return requested;
  const entries = [...model.nodes.values()].filter((ref) => ref.kind === "entry");
  const chat = entries.find((ref) => entryMetaOf(ref.use)?.input === ChatMessage);
  return (chat ?? entries[0])?.name ?? "";
}

/**
 * Public entry point: validates input, opens or continues a thread, checks the daily cap (nothing
 * left → no calls), runs the flow within the workflow's limits, records spend as it happens and
 * writes a Tern for every outcome — answered, guarded, paused or failed (a limit, a router).
 */
export async function runAgent<TName extends string>(
  input: unknown,
  deps: RunDeps<TName>,
  options: RunOptions = {},
): Promise<AgentRunResult> {
  const { task, threadId: requested, entry } = RunInputSchema.parse(input);
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
    const runId = randomUUID();
    const flow = await flowGraphOf(deps, run);
    const config = streamConfig(deps, { threadId, runId }, options.signal);
    const record = recorder(deps, account, spent);
    const start = {
      task,
      budgetUsd,
      history,
      summaries,
      runId,
      entry: entryFor(flow.model, entry),
    };
    const state = await drainRun(await flow.graph.stream(start, config), record);
    const recorded = state.usage.length;
    const context = { deps, flow, base, runId, budgetUsd, record, recorded };
    return await finishRun({ ...context, callbacks: config.callbacks }, state);
  } catch (error) {
    const cause = outcomeError(error, options.signal);
    await deps.terns.append({ ...base, ...failedOutcome(cause, spent) });
    throw cause;
  }
}
