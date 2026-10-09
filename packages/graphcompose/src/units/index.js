export class UnitError extends RangeError {
  name = "UnitError";
}
function nonNegative(amount, unit) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new UnitError(`${unit} must be a finite number ≥ 0, got ${String(amount)}`);
  }
  return amount;
}
/** US dollars: `usd(0.5)`. */
export const usd = (amount) => nonNegative(amount, "usd");
/** A duration given in seconds. */
export const seconds = (amount) => nonNegative(amount, "seconds") * 1000;
/** A duration given in minutes. */
export const minutes = (amount) => nonNegative(amount, "minutes") * 60_000;
