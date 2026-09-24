import type { HistoryTurn } from "../graph/contributions.js";
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

/** First contact → a new thread; a given id must exist for this bundle (validation, no calls). */
export async function openThread<TName extends string>(
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
