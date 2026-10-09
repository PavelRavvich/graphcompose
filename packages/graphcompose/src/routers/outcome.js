export const decided = (decision, usage) =>
  usage === undefined ? { kind: "decided", decision } : { kind: "decided", decision, usage };
export const failed = (reason, usage) =>
  usage === undefined ? { kind: "failed", reason } : { kind: "failed", reason, usage };
/** The model picked something that is not an option: a failure that names it. */
export const unknownOption = (option, usage) => ({
  kind: "failed",
  reason: `unknown route: ${option}`,
  usage,
  unknownOption: option,
});
export function errorReason(error) {
  return `router error: ${error instanceof Error ? error.message : String(error)}`;
}
