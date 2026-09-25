import type { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { BudgetExceededError, runBudgetUsd } from "../finops/ledger.js";
import { drainRecordingUsage } from "../finops/record-stream.js";
import { buildCostReport, totalCost, type UsageRecord } from "../finops/usage.js";
import { PaidStepError } from "../graph/errors.js";
import type { AgentGraph } from "../graph/graph.js";
import type { AgentStateType } from "../graph/state.js";
import type { NewTern, TernOutcome } from "../terns/index.js";
import type { AgentRunResult, RunDeps, RunStatus, SpendAccount } from "./types.js";

export type TernBase = Pick<
  NewTern,
  "threadId" | "bundle" | "task" | "replayOf" | "promptVersion" | "modelVersion"
>;

export interface RunContext<TName extends string> {
  readonly deps: RunDeps<TName>;
  readonly graph: AgentGraph;
  readonly base: TernBase;
  readonly runId: string;
  readonly budgetUsd: number;
}

/** Stream config: checkpoint thread = run id; tracing callbacks when tracing is on. */
export function streamConfig<TName extends string>(
  deps: RunDeps<TName>,
  context: { readonly threadId: string; readonly runId: string },
  signal?: AbortSignal,
): ReturnType<typeof runConfig> & {
  streamMode: "values";
  runName: string;
  callbacks: BaseCallbackHandler[];
  signal?: AbortSignal;
} {
  const callbacks = deps.tracing?.callbacks({ bundle: deps.config.name, ...context }) ?? [];
  return {
    ...runConfig(context.runId),
    streamMode: "values",
    runName: deps.config.name,
    callbacks,
    ...(signal === undefined ? {} : { signal }),
  };
}

/** LangGraph checkpoint thread = the run id (not the conversation thread). */
export const runConfig = (runId: string): { configurable: { thread_id: string } } => ({
  configurable: { thread_id: runId },
});

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** A run stopped by its signal reads as interrupted, whatever error the abort surfaced as. */
export const outcomeError = (error: unknown, signal: AbortSignal | undefined): unknown =>
  signal?.aborted === true ? new Error("interrupted by the user") : error;

export const failedOutcome = (error: unknown, spent: readonly UsageRecord[]): TernOutcome => ({
  answer: "",
  status: "failed",
  stopReason: errorMessage(error),
  route: [],
  steps: [],
  costUsd: totalCost(spent),
  attempts: [],
});

/** Writes spend to the account's ledger as it happens and remembers it for the Tern. */
export function recorder<TName extends string>(
  deps: RunDeps<TName>,
  account: SpendAccount,
  spent: UsageRecord[],
): (records: readonly UsageRecord[]) => Promise<void> {
  return async (records) => {
    spent.push(...records);
    await deps.ledger.record(account.key, records);
  };
}

/** Run budget = run cap ∩ what is left of the account's day; nothing left → no calls at all. */
export async function allowedBudget<TName extends string>(
  deps: RunDeps<TName>,
  account: SpendAccount,
): Promise<number> {
  const caps = { ...deps.config.budget, dailyBudgetCap: account.dailyCap };
  const budgetUsd = runBudgetUsd(caps, await deps.ledger.spentToday(account.key));
  if (budgetUsd <= 0) {
    throw new BudgetExceededError(`Daily budget of "${account.key}" is spent — no calls made`);
  }
  return budgetUsd;
}

/** LangGraph emits `{ __interrupt__ }` chunks when a run pauses; only real states carry usage. */
async function* statesOnly(chunks: AsyncIterable<AgentStateType>): AsyncGenerator<AgentStateType> {
  for await (const chunk of chunks) {
    if (Array.isArray((chunk as Partial<AgentStateType>).usage)) yield chunk;
  }
}

/** Drains the graph stream; a paid failure (agent, guard) still records its spend. */
export function drainRun(
  states: AsyncIterable<AgentStateType>,
  record: (records: readonly UsageRecord[]) => Promise<void>,
  alreadyRecorded = 0,
): Promise<AgentStateType> {
  return drainRecordingUsage(statesOnly(states), record, alreadyRecorded).catch(
    async (error: unknown) => {
      if (error instanceof PaidStepError) await record(error.usage);
      throw error;
    },
  );
}

function outcomeOf(state: AgentStateType, paused: boolean): TernOutcome & { status: RunStatus } {
  const status: RunStatus = paused ? "paused" : state.guarded === "" ? "answered" : "guarded";
  return {
    answer: paused ? "" : state.answer,
    status,
    stopReason: paused ? "waiting for human approval" : state.routeReason,
    route: state.contributions.map((item) => item.agent),
    steps: state.contributions,
    costUsd: totalCost(state.usage),
    attempts: state.attempts,
  };
}

const traceUrlOf = <TName extends string>(
  deps: RunDeps<TName>,
  threadId: string,
): { traceUrl?: string } => {
  const traceUrl = deps.tracing?.sessionUrl(threadId);
  return traceUrl === undefined ? {} : { traceUrl };
};

/** Pause is detected from the checkpoint: a run with next nodes left is waiting for a human. */
async function isPaused<TName extends string>(ctx: RunContext<TName>): Promise<boolean> {
  if (ctx.deps.pause === undefined) return false;
  return (await ctx.graph.getState(runConfig(ctx.runId))).next.length > 0;
}

/** Writes (or completes) the Tern and shapes the result: answered, guarded or paused. */
export async function finishRun<TName extends string>(
  ctx: RunContext<TName>,
  state: AgentStateType,
  existingTernId?: string,
): Promise<AgentRunResult> {
  const paused = await isPaused(ctx);
  const outcome = outcomeOf(state, paused);
  let ternId = existingTernId;
  if (ternId === undefined) ternId = (await ctx.deps.terns.append({ ...ctx.base, ...outcome })).id;
  else await ctx.deps.terns.complete(ternId, outcome);
  return {
    status: outcome.status,
    answer: outcome.answer,
    route: outcome.route,
    stopReason: outcome.stopReason,
    budgetUsd: ctx.budgetUsd,
    cost: buildCostReport(state.usage),
    threadId: ctx.base.threadId,
    ternId,
    runId: ctx.runId,
    ...(paused && state.pending !== null ? { pending: state.pending } : {}),
    ...traceUrlOf(ctx.deps, ctx.base.threadId),
    ...(state.attempts.length === 0 ? {} : { attempts: state.attempts }),
  };
}
