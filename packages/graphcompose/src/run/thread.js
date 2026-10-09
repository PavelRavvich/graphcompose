export class UnknownThreadError extends Error {
  name = "UnknownThreadError";
}
/** Deepest history any router (defaults) or agent of the config may need. */
function historyDepth(deps) {
  const agentLimits = Object.values(deps.config.agents).map((agent) => agent.historyLimit ?? 0);
  return Math.max(deps.config.defaults.history.limit, ...agentLimits);
}
/** Deepest summary list any reader needs (compaction). */
function summariesDepth(deps) {
  const fallback = deps.config.defaults.history.summaries ?? deps.config.compaction?.keep ?? 0;
  const agentLimits = Object.values(deps.config.agents).map(
    (agent) => agent.historySummaries ?? fallback,
  );
  return Math.max(fallback, ...agentLimits);
}
const toTurns = (terns) =>
  terns.map(({ task, replyWith, status }) => ({ task, replyWith, status }));
/** With compaction: the latest summaries + raw turns not yet summarised; without: the last turns. */
async function memoryOf(deps, threadId) {
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
export async function openThread(deps, requested) {
  const bundle = deps.config.name;
  if (requested === undefined) {
    return { threadId: await deps.terns.createThread(bundle), history: [], summaries: [] };
  }
  if (!(await deps.terns.hasThread(bundle, requested))) {
    throw new UnknownThreadError(`Unknown thread "${requested}" for "${bundle}"`);
  }
  return { threadId: requested, ...(await memoryOf(deps, requested)) };
}
