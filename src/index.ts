import { BudgetExceededError, runBudgetUsd, type SpendLedger } from "./finops/ledger.js";
import { drainRecordingUsage } from "./finops/record-stream.js";
import { buildCostReport, type CostReport } from "./finops/usage.js";
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
  const states = await buildGraph(deps).stream({ task, budgetUsd }, { streamMode: "values" });
  const state = await drainRecordingUsage(states, (records) =>
    deps.ledger.record(deps.config.name, records),
  );
  return {
    answer: state.answer,
    route: state.contributions.map((item) => item.agent),
    stopReason: state.routeReason,
    budgetUsd,
    cost: buildCostReport(state.usage),
  };
}
