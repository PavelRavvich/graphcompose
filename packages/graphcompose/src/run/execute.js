import { drainRecordingUsage } from "../finops/record-stream.js";
import { totalCost } from "../finops/usage.js";
import { PaidStepError } from "../graph/errors.js";
import { LimitExceededError } from "../graph/limits.js";
import { usd } from "../units/index.js";
import { runConfig } from "./paused.js";
export { runConfig } from "./paused.js";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
class StreamingCallbackHandler extends BaseCallbackHandler {
  onStream;
  name = "StreamingCallbackHandler";
  constructor(onStream) {
    super();
    this.onStream = onStream;
  }
  handleLLMNewToken(token) {
    this.onStream({ kind: "textDelta", delta: token });
  }
  handleToolStart(tool, input) {
    this.onStream({ kind: "toolCall", tool: tool.id.at(-1) ?? "unknown", args: input });
  }
}
export function streamConfig(deps, context, options) {
  const callbacks = deps.tracing?.callbacks({ bundle: deps.config.name, ...context }) ?? [];
  if (options?.onStream !== undefined) {
    callbacks.push(new StreamingCallbackHandler(options.onStream));
  }
  return {
    ...runConfig(context.runId, options?.executionContext),
    streamMode: "values",
    durability: "sync",
    runName: deps.config.name,
    callbacks,
    ...(options?.signal === undefined ? {} : { signal: options.signal }),
  };
}
const errorMessage = (error) => (error instanceof Error ? error.message : String(error));
/** A run stopped by its signal reads as cancelled, whatever error the abort surfaced as. */
export const outcomeError = (error, signal) =>
  signal?.aborted === true ? new Error("the run was cancelled") : error;
export const failedOutcome = (error, spent) => ({
  replyWith: "",
  status: "failed",
  stopReason: errorMessage(error),
  route: [],
  steps: [],
  costUsd: totalCost(spent),
});
/** Writes spend to the account's ledger as it happens and remembers it for the Tern. */
export function recorder(deps, account, spent) {
  return async (records) => {
    spent.push(...records);
    await deps.ledger.record(account.key, records);
  };
}
/** The account a run pays from: the workflow's own, its daily cap `limits.perDay.cost`. */
export const workflowAccount = (deps) => ({
  key: deps.config.name,
  dailyCap: deps.limits.perDay?.cost ?? Number.POSITIVE_INFINITY,
});
const limitsFor = (limits, account) => ({
  ...(limits.perRun === undefined ? {} : { perRun: limits.perRun }),
  ...(Number.isFinite(account.dailyCap) ? { perDay: { cost: usd(account.dailyCap) } } : {}),
});
/** Run budget = run cap ∩ what is left of the account's day; nothing left → no calls at all. */
export async function allowedBudget(deps, account) {
  const spentToday = await deps.ledger.spentToday(account.key);
  const left = account.dailyCap - spentToday;
  if (left <= 0) {
    const breach = {
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
async function* statesOnly(chunks) {
  for await (const chunk of chunks) {
    if (Array.isArray(chunk.usage)) yield chunk;
  }
}
/** Spend a failure carries that the run's state does not hold yet. */
const unrecordedSpendOf = (error) =>
  error instanceof PaidStepError || error instanceof LimitExceededError ? error.usage : [];
/** Drains the graph stream; a paid failure (agent, guard, router, an agent's limit) still records its spend. */
export function drainRun(states, record, alreadyRecorded = 0) {
  return drainRecordingUsage(statesOnly(states), record, alreadyRecorded).catch(async (error) => {
    const unrecorded = unrecordedSpendOf(error);
    if (unrecorded.length > 0) await record(unrecorded);
    throw error;
  });
}
