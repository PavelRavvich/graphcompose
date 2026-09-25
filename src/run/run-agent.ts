import { randomUUID } from "node:crypto";
import type { UsageRecord } from "../finops/usage.js";
import { buildGraph } from "../graph/graph.js";
import { RunInputSchema } from "../input.js";
import {
  allowedBudget,
  drainRun,
  failedOutcome,
  finishRun,
  recorder,
  streamConfig,
  type TernBase,
} from "./execute.js";
import { openThread } from "./thread.js";
import type { AgentRunResult, RunDeps, RunOptions } from "./types.js";
import { runVersions } from "./versions.js";

/**
 * Public entry point: validates input, opens or continues a thread, checks the daily cap (nothing
 * left → no calls), runs the graph within the run budget, records spend as it happens and writes a
 * Tern for every outcome — answered, guarded, paused or failed.
 */
export async function runAgent<TName extends string>(
  input: unknown,
  deps: RunDeps<TName>,
  options: RunOptions = {},
): Promise<AgentRunResult> {
  const { task, threadId: requested } = RunInputSchema.parse(input);
  const account = options.account ?? {
    key: deps.config.name,
    dailyCap: deps.config.budget.dailyBudgetCap,
  };
  const { threadId, history } = await openThread(deps, requested);
  const spent: UsageRecord[] = [];
  const base: TernBase = {
    threadId,
    bundle: deps.config.name,
    task,
    replayOf: options.replayOf ?? null,
    ...runVersions(deps),
  };
  try {
    const budgetUsd = await allowedBudget(deps, account);
    const runId = randomUUID();
    const graph = buildGraph(deps);
    const states = await graph.stream(
      { task, budgetUsd, history, runId },
      streamConfig(deps, { threadId, runId }),
    );
    const state = await drainRun(states, recorder(deps, account, spent));
    return await finishRun({ deps, graph, base, runId, budgetUsd }, state);
  } catch (error) {
    await deps.terns.append({ ...base, ...failedOutcome(error, spent) });
    throw error;
  }
}
