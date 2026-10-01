import type { AgentRunResult } from "../run/types.js";

/** Paused runs by thread: what `app.resume(thread, …)` continues. */
export interface PausedRunRepository {
  readonly get: (thread: string) => AgentRunResult | undefined;
  readonly set: (run: AgentRunResult) => void;
  readonly delete: (thread: string) => void;
}

/** Paused runs in memory: one app, or every app of one test sharing it. */
export function createMemoryPausedRunRepository(): PausedRunRepository {
  const runs = new Map<string, AgentRunResult>();
  return {
    get: (thread) => runs.get(thread),
    set: (run) => {
      runs.set(run.threadId, run);
    },
    delete: (thread) => {
      runs.delete(thread);
    },
  };
}
