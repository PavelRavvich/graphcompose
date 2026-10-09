/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildCostReport, totalCost } from "../finops/usage.js";
import { compactIfDue } from "./compaction.js";
import { isWaiting, pausedLoopOf } from "./paused.js";
/** Where the run ended: the workflow finish it reached, if it reached one (not when guarded or paused). */
function finishOf(ctx, state) {
  const last = state.path.at(-1);
  const ref = last === undefined ? undefined : ctx.flow.model.nodes.get(last);
  return {
    ...(ref?.kind === "workflow-finish" ? { finish: ref.name } : {}),
    ...(state.finishes && Object.keys(state.finishes).length > 0
      ? { finishes: state.finishes }
      : {}),
  };
}
function outcomeOf(state, paused) {
  const status = paused ? "paused" : state.guarded === "" ? "answered" : "guarded";
  return {
    replyWith: paused ? "" : state.replyWith,
    status,
    stopReason: paused ? "waiting for approval" : state.routeReason,
    route: state.contributions.map((item) => item.agent),
    steps: state.contributions,
    costUsd: totalCost(state.usage),
  };
}
/** The visited nodes; a paused run waits in an agent whose visit has not finished yet. */
const pathOf = (state, pending) =>
  pending === undefined ? state.path : [...state.path, pending.agent];
const traceUrlOf = (deps, threadId) => {
  const traceUrl = deps.tracing?.sessionUrl(threadId);
  return traceUrl === undefined ? {} : { traceUrl };
};
/** Conversation memory after a finished turn; its spend is recorded to the run's account. */
async function compactAfter(ctx, state) {
  const memory = await compactIfDue(ctx.deps, {
    threadId: ctx.base.threadId,
    budgetLeftUsd: ctx.budgetUsd - totalCost(state.usage),
    callbacks: ctx.callbacks,
  });
  if (memory.usage.length > 0) await ctx.record(memory.usage);
  return memory;
}
/**
 * The state a run stopped in. A paused run waits inside an agent's loop (a subgraph): its spend so far
 * and the pending call are there — that spend goes to the ledger now, not on resume.
 */
async function stoppedState(ctx, state) {
  const pause = ctx.deps.pause;
  if (pause === undefined || !(await isWaiting(ctx.flow.graph, ctx.runId))) {
    return { current: state, paused: false };
  }
  const loop = await pausedLoopOf(ctx.flow.graph, pause.checkpointer, ctx.runId);
  if (loop === undefined) return { current: state, paused: true };
  await ctx.record(loop.state.usage.slice(Math.max(ctx.recorded, state.usage.length)));
  return { current: loop.state, paused: true, pending: loop.pending };
}
/** Writes (or completes) the Tern and shapes the result: answered, guarded or paused. */
export async function finishRun(ctx, state, existingTernId) {
  const { current, paused, pending } = await stoppedState(ctx, state);
  const outcome = outcomeOf(current, paused);
  let ternId = existingTernId;
  if (ternId === undefined) ternId = (await ctx.deps.terns.append({ ...ctx.base, ...outcome })).id;
  else await ctx.deps.terns.complete(ternId, outcome);
  const memory = paused ? { usage: [] } : await compactAfter(ctx, current);
  return {
    status: outcome.status,
    replyWith: outcome.replyWith,
    route: outcome.route,
    path: pathOf(state, pending),
    stopReason: outcome.stopReason,
    budgetUsd: ctx.budgetUsd,
    cost: buildCostReport([...current.usage, ...memory.usage]),
    threadId: ctx.base.threadId,
    ternId,
    runId: ctx.runId,
    ...(paused ? {} : finishOf(ctx, state)),
    ...(pending === undefined ? {} : { pending }),
    ...traceUrlOf(ctx.deps, ctx.base.threadId),
    ...(memory.compacted === undefined ? {} : { compacted: memory.compacted }),
  };
}
