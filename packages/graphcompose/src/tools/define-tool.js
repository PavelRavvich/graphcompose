import { pathOf } from "../dto/errors.js";
import { isGraphInterrupt } from "@langchain/langgraph";
export const DEFAULT_TOOL_TIMEOUT_MS = 30_000;
/** Function names accepted by OpenAI-compatible providers. */
const TOOL_NAME = /^[a-zA-Z0-9_-]{1,64}$/;
export class InvalidToolNameError extends Error {
  name = "InvalidToolNameError";
}
export class ToolTimeoutError extends Error {
  name = "ToolTimeoutError";
  constructor(timeoutMs) {
    super(`timed out after ${String(timeoutMs)} ms`);
  }
}
const describeIssues = (error) =>
  error.issues.map((issue) => `${pathOf(issue.path)}: ${issue.message}`).join("; ");
const errorMessage = (error) => (error instanceof Error ? error.message : String(error));
const failure = (message) => ({ kind: "error", message });
/** Rejects when the signal aborts, even if the work ignores the signal. */
function untilAborted(work, signal) {
  return new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => {
      reject(signal.reason);
    });
    work.then(resolve, reject);
  });
}
async function runWithTimeout(run, outer, timeoutMs) {
  if (outer.aborted) throw outer.reason; // never start work for a cancelled run
  const timeout = new AbortController();
  const timer = setTimeout(() => {
    timeout.abort(new ToolTimeoutError(timeoutMs));
  }, timeoutMs);
  const signal = AbortSignal.any([outer, timeout.signal]);
  try {
    return await untilAborted(
      Promise.resolve().then(() => run(signal)),
      signal,
    );
  } finally {
    clearTimeout(timer);
  }
}
/** Declares a tool once: zod input/output, typed `run`, failures turned into error results. */
export function defineTool(definition) {
  if (!TOOL_NAME.test(definition.name)) {
    throw new InvalidToolNameError(
      `Tool name "${definition.name}" must match ${String(TOOL_NAME)}`,
    );
  }
  const timeoutMs = definition.timeoutMs ?? DEFAULT_TOOL_TIMEOUT_MS;
  const invoke = async (raw, ctx) => {
    const input = definition.input.safeParse(raw);
    if (!input.success) return failure(`invalid input: ${describeIssues(input.error)}`);
    let produced;
    try {
      produced = await runWithTimeout(
        (signal) => definition.run(input.data, { ...ctx, signal }),
        ctx.signal,
        timeoutMs,
      );
    } catch (error) {
      if (
        isGraphInterrupt(error) ||
        (error && typeof error === "object" && "name" in error && error.name === "GraphInterrupt")
      ) {
        throw error;
      }
      return failure(errorMessage(error));
    }
    const output = definition.output.safeParse(produced);
    if (!output.success) return failure(`invalid output: ${describeIssues(output.error)}`);
    return { kind: "ok", value: output.data };
  };
  return {
    name: definition.name,
    description: definition.description,
    ...(definition.channel === undefined ? {} : { channel: definition.channel }),
    timeoutMs,
    input: definition.input,
    output: definition.output,
    invoke,
  };
}
