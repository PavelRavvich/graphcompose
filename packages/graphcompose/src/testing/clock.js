import { TestSetupError } from "./errors.js";
const UNIT_MS = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
const isUnit = (unit) => Object.hasOwn(UNIT_MS, unit);
/** Milliseconds of a duration. */
export function millisecondsOf(duration) {
  const match = /^(\d+(?:\.\d+)?)(ms|s|m|h|d)$/.exec(duration);
  const unit = match?.[2] ?? "";
  if (match === null || !isUnit(unit)) {
    throw new TestSetupError(`Not a duration: "${duration}" (e.g. "30s", "25h")`);
  }
  return Number(match[1]) * UNIT_MS[unit];
}
/** Every test starts at the same moment, so runs and days are reproducible. */
export const TEST_START = "2026-01-05T09:00:00.000Z";
export function createTestClock(start = TEST_START) {
  let current = new Date(start).getTime();
  return {
    now: () => new Date(current),
    advance: (duration) => {
      current += millisecondsOf(duration);
    },
  };
}
