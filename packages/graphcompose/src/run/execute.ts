import { drainRecordingUsage } from "../finops/record-stream.js";
import { totalCost, type UsageRecord } from "../finops/usage.js";
import type { FlowGraph } from "../graph/build.js";
import { PaidStepError } from "../graph/errors.js";
import type { FlowStateType } from "../graph/flow-state.js";
import { LimitExceededError, type LimitBreach } from "../graph/limits.js";
import type { RunLimits } from "../graph/flow-runtime.js";
import type { WorkflowLimits } from "../graph/settings.js";
import type { NewTern, TernOutcome } from "../terns/index.js";
import { usd } from "../units/index.js";
import { runConfig } from "./paused.js";
import type { RunDeps, SpendAccount } from "./types.js";

export { runConfig } from "./paused.js";

export type TernBase = Pick<
  NewTern,
  | "threadId"
  | "bundle"
  | "task"
  | "replayOf"
  | "promptVersion"
  | "modelVersion"
  | "configVersion"
  | "configHash"
>;

export interface RunContext<TName extends string> {
  readonly deps: RunDeps<TName>;
  readonly flow: FlowGraph;
  readonly base: TernBase;
  readonly runId: string;
  readonly budgetUsd: number;
  /** Where spend goes as it happens: the run's ledger account. */
  readonly record: (records: readonly UsageRecord[]) => Promise<void>;
  /** How many of the run's usage records are already in the ledger. */
  readonly recorded: number;
  readonly callbacks: BaseCallbackHandler[];
}

/**
 * Stream config: checkpoint thread = run id, every step checkpointed before the next one starts
 * (`durability: "sync"` — what a resume after a crash continues from); tracing callbacks when on.
 */
import type { Serialized } from "@langchain/core/load/serializable";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { RunOptions, RunStreamEvent } from "./types.js";

class StreamingCallbackHandler extends BaseCallbackHandler {
  name = "StreamingCallbackHandler";
  constructor(private readonly onStream: (event: RunStreamEvent) => void) {
    super();
  }
  override handleLLMNewToken(token: string) {
    this.onStream({ kind: "textDelta", delta: token });
  }
  override handleToolStart(tool: Serialized, input: string) {
    this.onStream({ kind: "toolCall", tool: tool.id.at(-1) ?? "unknown", args: input });
  }
}

export function streamConfig<TName extends string>(
  deps: RunDeps<TName>,
  context: { readonly threadId: string; readonly runId: string },
  options?: RunOptions,
): ReturnType<typeof runConfig> & {
  streamMode: "values";
  durability: "sync";
  runName: string;
  callbacks: BaseCallbackHandler[];
  signal?: AbortSignal;
} {
  const callbacks = deps.tracing?.callbacks({ bundle: deps.config.name, ...context }) ?? [];
  if (options?.onStream !== undefined) {
    callbacks.push(new StreamingCallbackHandler(options.onStream));
  }
  return {
    ...runConfig(context.runId),
    streamMode: "values",
    durability: "sync",
    runName: deps.config.name,
    callbacks,
    ...(options?.signal === undefined ? {} : { signal: options.signal }),
  };
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** A run stopped by its signal reads as cancelled, whatever error the abort surfaced as. */
export const outcomeError = (error: unknown, signal: AbortSignal | undefined): unknown =>
  signal?.aborted === true ? new Error("the run was cancelled") : error;

export const failedOutcome = (error: unknown, spent: readonly UsageRecord[]): TernOutcome => ({
  replyWith: "",
  status: "failed",
  stopReason: errorMessage(error),
  route: [],
  steps: [],
  costUsd: totalCost(spent),
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

/** The account a run pays from: the workflow's own, its daily cap `limits.perDay.cost`. */
export const workflowAccount = <TName extends string>(deps: RunDeps<TName>): SpendAccount => ({
  key: deps.config.name,
  dailyCap: deps.limits.perDay?.cost ?? Number.POSITIVE_INFINITY,
});

/** What a run may spend, and the limits the flow holds it to (the account's day, read once). */
export interface RunBudget {
  readonly budgetUsd: number;
  readonly run: RunLimits;
}

const limitsFor = (limits: WorkflowLimits, account: SpendAccount): WorkflowLimits => ({
  ...(limits.perRun === undefined ? {} : { perRun: limits.perRun }),
  ...(Number.isFinite(account.dailyCap) ? { perDay: { cost: usd(account.dailyCap) } } : {}),
});

/** Run budget = run cap ∩ what is left of the account's day; nothing left → no calls at all. */
export async function allowedBudget<TName extends string>(
  deps: RunDeps<TName>,
  account: SpendAccount,
): Promise<RunBudget> {
  const spentToday = await deps.ledger.spentToday(account.key);
  const left = account.dailyCap - spentToday;
  if (left <= 0) {
    const breach: LimitBreach = {
      key: "limits.perDay.cost",
      limit: account.dailyCap,
      actual: spentToday,
    };
    throw new LimitExceededError(breach, [], 0);
  }
  return {
    budgetUsd: Math.min(deps.limits.perRun?.cost ?? Number.POSITIVE_INFINITY, left),
    run: { limits: limitsFor(deps.limits, account), spentToday: () => Promise.resolve(spentToday) },
  };
}

/** LangGraph emits `{ __interrupt__ }` chunks when a run pauses; only real states carry usage. */
async function* statesOnly(chunks: AsyncIterable<FlowStateType>): AsyncGenerator<FlowStateType> {
  for await (const chunk of chunks) {
    if (Array.isArray((chunk as Partial<FlowStateType>).usage)) yield chunk;
  }
}

/** Spend a failure carries that the run's state does not hold yet. */
const unrecordedSpendOf = (error: unknown): readonly UsageRecord[] =>
  error instanceof PaidStepError || error instanceof LimitExceededError ? error.usage : [];

/** Drains the graph stream; a paid failure (agent, guard, router, an agent's limit) still records its spend. */
export function drainRun(
  states: AsyncIterable<FlowStateType>,
  record: (records: readonly UsageRecord[]) => Promise<void>,
  alreadyRecorded = 0,
): Promise<FlowStateType> {
  return drainRecordingUsage(statesOnly(states), record, alreadyRecorded).catch(
    async (error: unknown) => {
      const unrecorded = unrecordedSpendOf(error);
      if (unrecorded.length > 0) await record(unrecorded);
      throw error;
    },
  );
}
