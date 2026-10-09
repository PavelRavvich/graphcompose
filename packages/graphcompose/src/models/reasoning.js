/** How hard a model thinks before it answers. */
export var ReasoningEffort;
(function (ReasoningEffort) {
  ReasoningEffort["Minimal"] = "minimal";
  ReasoningEffort["Low"] = "low";
  ReasoningEffort["Medium"] = "medium";
  ReasoningEffort["High"] = "high";
  ReasoningEffort["ExtraHigh"] = "xhigh";
})(ReasoningEffort || (ReasoningEffort = {}));
export class ReasoningError extends RangeError {
  name = "ReasoningError";
}
export const Reasoning = {
  modelDecides() {
    return Object.freeze({ kind: "model-decides" });
  },
  on(options) {
    if (options.effort === undefined && options.budget === undefined) {
      throw new ReasoningError("Reasoning.on needs an effort, a budget or both");
    }
    if (
      options.budget !== undefined &&
      !(Number.isInteger(options.budget.tokens) && options.budget.tokens > 0)
    ) {
      throw new ReasoningError(
        `a reasoning budget is a positive whole number of tokens, got ${String(options.budget.tokens)}`,
      );
    }
    return Object.freeze({ kind: "on", ...options });
  },
  off() {
    return Object.freeze({ kind: "off" });
  },
};
const isEffort = (value) => Object.values(ReasoningEffort).includes(value);
/** Today's component `thinking` (until #152 brings `reasoning` to the decorators) as a `Reasoning`. */
export function reasoningOfThinking(thinking) {
  if (typeof thinking === "object") {
    return "kind" in thinking
      ? thinking
      : Reasoning.on({ budget: { tokens: thinking.budgetTokens } });
  }
  if (thinking === "default") return Reasoning.modelDecides();
  if (thinking === "none") return Reasoning.off();
  if (isEffort(thinking)) return Reasoning.on({ effort: thinking });
  throw new ReasoningError(`unknown thinking level "${thinking}"`);
}
/** How a reasoning setting reads in messages and the startup log. */
export function reasoningLabel(reasoning) {
  switch (reasoning.kind) {
    case "model-decides":
      return "model decides";
    case "off":
      return "off";
    case "on":
      return `on(${[
        ...(reasoning.effort === undefined ? [] : [`effort ${reasoning.effort}`]),
        ...(reasoning.budget === undefined
          ? []
          : [`budget ${String(reasoning.budget.tokens)} tokens`]),
      ].join(", ")})`;
  }
}
