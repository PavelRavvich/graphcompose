import { randomUUID } from "node:crypto";
import { BudgetExceededError, runBudgetUsd, type SpendLedger } from "./finops/ledger.js";
import { drainRecordingUsage } from "./finops/record-stream.js";
import { buildCostReport, type CostReport, type UsageRecord } from "./finops/usage.js";
import { AgentFailedError } from "./graph/errors.js";
import { buildGraph, type GraphDeps } from "./graph/graph.js";
import { RunInputSchema } from "./input.js";

export type { GraphDeps } from "./graph/graph.js";

/** Graph dependencies plus the bundle's daily spend ledger. */
export interface RunDeps<TName extends string> extends GraphDeps<TName> {
  readonly ledger: SpendLedger;
}

export interface AgentRunResult {
  readonly answer: string;
  /** Agents in the order they ran. */
  readonly route: readonly string[];
  readonly stopReason: string;
  readonly budgetUsd: number;
  readonly cost: CostReport;
}

/**
 * Public entry point: validates input, checks the bundle's daily cap (nothing left → no calls),
 * runs the graph within the run budget, records spend as it happens, returns answer + cost.
 */
export async function runAgent<TName extends string>(
  input: unknown,
  deps: RunDeps<TName>,
): Promise<AgentRunResult> {
  const { task } = RunInputSchema.parse(input);
  const spentToday = await deps.ledger.spentToday(deps.config.name);
  const budgetUsd = runBudgetUsd(deps.config.budget, spentToday);
  if (budgetUsd <= 0) {
    throw new BudgetExceededError(`Daily budget of "${deps.config.name}" is spent — no calls made`);
  }
  const record = (records: readonly UsageRecord[]): Promise<void> =>
    deps.ledger.record(deps.config.name, records);
  const states = await buildGraph(deps).stream(
    { task, budgetUsd, runId: randomUUID() },
    { streamMode: "values" },
  );
  const state = await drainRecordingUsage(states, record).catch(async (error: unknown) => {
    if (error instanceof AgentFailedError) await record(error.usage); // failures are paid for too
    throw error;
  });
  return {
    answer: state.answer,
    route: state.contributions.map((item) => item.agent),
    stopReason: state.routeReason,
    budgetUsd,
    cost: buildCostReport(state.usage),
  };
}
