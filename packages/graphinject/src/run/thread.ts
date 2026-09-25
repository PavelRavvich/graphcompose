import type { HistoryTurn } from "../graph/contributions.js";
import type { Tern } from "../terns/index.js";
import type { RunDeps } from "./types.js";

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

/** Deepest summary list any reader needs (compaction). */
function summariesDepth<TName extends string>(deps: RunDeps<TName>): number {
  const fallback = deps.config.defaults.history.summaries ?? deps.config.compaction?.keep ?? 0;
  const agentLimits = Object.values<{ readonly historySummaries?: number }>(deps.config.agents).map(
    (agent) => agent.historySummaries ?? fallback,
  );
  return Math.max(fallback, deps.config.routers.main.historySummaries ?? fallback, ...agentLimits);
}

const toTurns = (terns: readonly Tern[]): HistoryTurn[] =>
  terns.map(({ task, answer, status }) => ({ task, answer, status }));

/** With compaction: the latest summaries + raw turns not yet summarised; without: the last turns. */
async function memoryOf<TName extends string>(
  deps: RunDeps<TName>,
  threadId: string,
): Promise<{ readonly history: HistoryTurn[]; readonly summaries: string[] }> {
  if (deps.config.compaction === undefined) {
    return {
      history: toTurns(await deps.terns.lastTerns(threadId, historyDepth(deps))),
      summaries: [],
    };
  }
  const raw = await deps.terns.uncovered(threadId);
  const summaries = await deps.terns.latestSummaries(threadId, summariesDepth(deps));
  return {
    history: toTurns(raw.slice(-historyDepth(deps))),
    summaries: summaries.map((summary) => summary.text),
  };
}

/** First contact → a new thread; a given id must exist for this workflow (validation, no calls). */
export async function openThread<TName extends string>(
  deps: RunDeps<TName>,
  requested: string | undefined,
): Promise<{
  readonly threadId: string;
  readonly history: HistoryTurn[];
  readonly summaries: string[];
}> {
  const bundle = deps.config.name;
  if (requested === undefined) {
    return { threadId: await deps.terns.createThread(bundle), history: [], summaries: [] };
  }
  if (!(await deps.terns.hasThread(bundle, requested))) {
    throw new UnknownThreadError(`Unknown thread "${requested}" for "${bundle}"`);
  }
  return { threadId: requested, ...(await memoryOf(deps, requested)) };
}
