import { componentOf } from "../components/metadata.js";
import { TestSetupError } from "./errors.js";
import { ModelFailure } from "../models/model-failure.js";
/** How a scripted model call fails — the failures a provider's retry policy knows. */
export { ModelFailure };
/** An agent's model answers with text: `replyWith("3 jobs found", { cost: usd(0.002) })`. */
export const replyWith = (text, details = {}) => ({
  kind: "replyWith",
  text,
  details,
});
/** The name an agent's model calls a `@Tool` / `@McpTool` class by. */
export function toolNameOf(tool) {
  const meta = componentOf(tool);
  if (meta?.kind !== "tool" && meta?.kind !== "mcp-tool") {
    throw new TestSetupError(`${tool.name} is not a @Tool or @McpTool`);
  }
  return meta.meta.name;
}
/**
 * An agent's model calls a tool: `callTool(SaveShortlist, { jobs: ["Acme"] })` — the arguments are
 * typed by the tool's input DTO (compile time) and validated by the tool when it runs.
 */
export function callTool(tool, args) {
  return {
    kind: "tool-call",
    tool: toolNameOf(tool),
    args: Object.fromEntries(Object.entries(args)),
  };
}
/** A router decides for one of its routes: `routeTo(Scout)`, `routeTo(Self)`. */
export const routeTo = (target, details = {}) => ({
  kind: "decision",
  target,
  details,
});
/** The model call fails: `failWith(ModelFailure.Timeout)`. */
export const failWith = (failure) => ({ kind: "failure", failure });
/** A scripted model failure, as an agent's loop sees it. */
export class ModelCallFailedError extends Error {
  name = "ModelCallFailedError";
  failure;
  constructor(failure, component) {
    super(`scripted model failure for ${component}: ${failure}`);
    this.failure = failure;
  }
}
