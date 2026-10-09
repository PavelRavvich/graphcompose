/** Paused runs in memory: one app, or every app of one test sharing it. */
export function createMemoryPausedRunRepository() {
  const runs = new Map();
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
