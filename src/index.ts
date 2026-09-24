import { randomUUID } from "node:crypto";
import { BudgetExceededError, runBudgetUsd, type SpendLedger } from "./finops/ledger.js";
import { drainRecordingUsage } from "./finops/record-stream.js";
import { buildCostReport, totalCost, type CostReport, type UsageRecord } from "./finops/usage.js";
import { PaidStepError } from "./graph/errors.js";
import { buildGraph, type GraphDeps } from "./graph/graph.js";
import type { HistoryTurn } from "./graph/contributions.js";
import type { AgentStateType } from "./graph/state.js";
import { RunInputSchema } from "./input.js";
import { reviewPromptTexts } from "./prompts/agents.js";
import { routerPromptTexts } from "./routers/index.js";
import { versionOf, type NewTern, type TernStore } from "./terns/index.js";

export type { GraphDeps } from "./graph/graph.js";

/** Graph dependencies plus the daily spend ledger and the Tern store. */
export interface RunDeps<TName extends string> extends GraphDeps<TName> {
  readonly ledger: SpendLedger;
  readonly terns: TernStore;
}

/** Which ledger account pays for a run and its daily cap. Default: the bundle itself. */
export interface SpendAccount {
  readonly key: string;
  readonly dailyCap: number;
}

export interface RunOptions {
  /** Id of the Tern this run replays (eval). */
  readonly replayOf?: string;
  readonly account?: SpendAccount;
}

export interface AgentRunResult {
  readonly answer: string;
  /** Agents in the order they ran. */
  readonly route: readonly string[];
  readonly stopReason: string;
  readonly budgetUsd: number;
  readonly cost: CostReport;
  readonly threadId: string;
  readonly ternId: string;
}

/** Prompt and model versions of the current configuration — stored with every Tern. */
export function runVersions<TName extends string>(
  deps: RunDeps<TName>,
): { readonly promptVersion: string; readonly modelVersion: string } {
  return {
    promptVersion: versionOf({
      agents: deps.prompts,
      routers: routerPromptTexts,
      review: reviewPromptTexts,
      guards: [...deps.guards.input, ...deps.guards.output].map(
        ({ name, question, flag, pass }) => ({
          name,
          question,
          flag,
          pass,
        }),
      ),
    }),
    modelVersion: versionOf({
      defaults: deps.config.defaults,
      routers: deps.config.routers,
      agents: deps.config.agents,
    }),
  };
}

export class UnknownThreadError extends Error {
  override name = "UnknownThreadError";
}

/** Deepest history any router or agent of the config may need. */
function historyDepth<TName extends string>(deps: RunDeps<TName>): number {
  const agentLimits = Object.values<{ readonly historyLimit?: number }>(deps.config.agents).map(
    (agent) => agent.historyLimit ?? 0,
  );
  return Math.max(
    deps.config.defaults.history.limit,
    deps.config.routers.main.historyLimit ?? 0,
    ...agentLimits,
  );
}

/** First contact → a new thread; a given id must exist for this bundle (validation, no calls). */
async function openThread<TName extends string>(
  deps: RunDeps<TName>,
  requested: string | undefined,
): Promise<{ readonly threadId: string; readonly history: HistoryTurn[] }> {
  const bundle = deps.config.name;
  if (requested === undefined)
    return { threadId: await deps.terns.createThread(bundle), history: [] };
  if (!(await deps.terns.hasThread(bundle, requested))) {
    throw new UnknownThreadError(`Unknown thread "${requested}" for "${bundle}"`);
  }
  const terns = await deps.terns.lastTerns(requested, historyDepth(deps));
  return {
    threadId: requested,
    history: terns.map(({ task, answer, status }) => ({ task, answer, status })),
  };
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

async function streamRun<TName extends string>(
  deps: RunDeps<TName>,
  input: { readonly task: string; readonly budgetUsd: number; readonly history: HistoryTurn[] },
  record: (records: readonly UsageRecord[]) => Promise<void>,
): Promise<AgentStateType> {
  const states = await buildGraph(deps).stream(
    { ...input, runId: randomUUID() },
    { streamMode: "values" },
  );
  return drainRecordingUsage(states, record).catch(async (error: unknown) => {
    if (error instanceof PaidStepError) await record(error.usage); // failures are paid for too
    throw error;
  });
}

type TernBase = Pick<
  NewTern,
  "threadId" | "bundle" | "task" | "replayOf" | "promptVersion" | "modelVersion"
>;

const answeredTern = (base: TernBase, state: AgentStateType): NewTern => ({
  ...base,
  answer: state.answer,
  status: state.guarded === "" ? "answered" : "guarded",
  stopReason: state.routeReason,
  route: state.contributions.map((item) => item.agent),
  steps: state.contributions,
  costUsd: totalCost(state.usage),
});

const failedTern = (base: TernBase, error: unknown, spent: readonly UsageRecord[]): NewTern => ({
  ...base,
  answer: "",
  status: "failed",
  stopReason: errorMessage(error),
  route: [],
  steps: [],
  costUsd: totalCost(spent),
});

/**
 * Public entry point: validates input, opens a thread, checks the daily cap (nothing left → no
 * calls), runs the graph within the run budget, records spend as it happens and writes a Tern
 * for every outcome — answered or failed.
 */
export async function runAgent<TName extends string>(
  input: unknown,
  deps: RunDeps<TName>,
  options: RunOptions = {},
): Promise<AgentRunResult> {
  const { task, threadId: requested } = RunInputSchema.parse(input);
  const bundle = deps.config.name;
  const account = options.account ?? { key: bundle, dailyCap: deps.config.budget.dailyBudgetCap };
  const { threadId, history } = await openThread(deps, requested);
  const spent: UsageRecord[] = [];
  const record = async (records: readonly UsageRecord[]): Promise<void> => {
    spent.push(...records);
    await deps.ledger.record(account.key, records);
  };
  const base: TernBase = {
    threadId,
    bundle,
    task,
    replayOf: options.replayOf ?? null,
    ...runVersions(deps),
  };
  try {
    const caps = { ...deps.config.budget, dailyBudgetCap: account.dailyCap };
    const budgetUsd = runBudgetUsd(caps, await deps.ledger.spentToday(account.key));
    if (budgetUsd <= 0) {
      throw new BudgetExceededError(`Daily budget of "${account.key}" is spent — no calls made`);
    }
    const state = await streamRun(deps, { task, budgetUsd, history }, record);
    const tern = await deps.terns.append(answeredTern(base, state));
    return {
      answer: state.answer,
      route: tern.route,
      stopReason: state.routeReason,
      budgetUsd,
      cost: buildCostReport(state.usage),
      threadId,
      ternId: tern.id,
    };
  } catch (error) {
    await deps.terns.append(failedTern(base, error, spent));
    throw error;
  }
}
