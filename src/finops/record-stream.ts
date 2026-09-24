import type { UsageRecord } from "./usage.js";

export class EmptyRunError extends Error {
  override name = "EmptyRunError";
}

/** Anything that carries the run's usage records so far (the graph state does). */
export interface HasUsage {
  readonly usage: readonly UsageRecord[];
}

/**
 * Drains a stream of full states, handing every new usage record to `record` as soon as it
 * appears, and returns the last state. Spend is persisted even if the run fails midway.
 */
export async function drainRecordingUsage<TState extends HasUsage>(
  states: AsyncIterable<TState>,
  record: (records: readonly UsageRecord[]) => Promise<void>,
): Promise<TState> {
  let last: TState | undefined;
  let recorded = 0;
  for await (const state of states) {
    await record(state.usage.slice(recorded));
    recorded = state.usage.length;
    last = state;
  }
  if (last === undefined) throw new EmptyRunError("The run produced no state");
  return last;
}
