export class EmptyRunError extends Error {
  name = "EmptyRunError";
}
/**
 * Drains a stream of full states, handing every new usage record to `record` as soon as it
 * appears, and returns the last state. Spend is persisted even if the run fails midway.
 */
export async function drainRecordingUsage(states, record, alreadyRecorded = 0) {
  let last;
  let recorded = alreadyRecorded;
  for await (const state of states) {
    // usage only grows; a resumed run's first states may be shorter than what is already recorded
    await record(state.usage.slice(recorded));
    recorded = Math.max(recorded, state.usage.length);
    last = state;
  }
  if (last === undefined) throw new EmptyRunError("The run produced no state");
  return last;
}
