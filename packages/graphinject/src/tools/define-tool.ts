import type { z } from "zod";
import type { Tool, ToolContext, ToolEffect, ToolResult } from "./types.js";

export const DEFAULT_TOOL_TIMEOUT_MS = 30_000;

/** Function names accepted by OpenAI-compatible providers. */
const TOOL_NAME = /^[a-zA-Z0-9_-]{1,64}$/;

export class InvalidToolNameError extends Error {
  override name = "InvalidToolNameError";
}

export class ToolTimeoutError extends Error {
  override name = "ToolTimeoutError";
  constructor(timeoutMs: number) {
    super(`timed out after ${String(timeoutMs)} ms`);
  }
}

/** TInput / TOutput are the parsed data types; both are inferred from the schemas. */
export interface ToolDefinition<TName extends string, TInput, TOutput> {
  readonly name: TName;
  readonly description: string;
  readonly input: z.ZodType<TInput>;
  readonly output: z.ZodType<TOutput>;
  readonly effect?: ToolEffect;
  readonly timeoutMs?: number;
  readonly run: (input: TInput, ctx: ToolContext) => Promise<TOutput>;
}

const describeIssues = (error: z.ZodError): string =>
  error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const failure = (message: string): ToolResult<never> => ({ kind: "error", message });

/** Rejects when the signal aborts, even if the work ignores the signal. */
function untilAborted<TValue>(work: Promise<TValue>, signal: AbortSignal): Promise<TValue> {
  return new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => {
      reject(signal.reason as Error);
    });
    work.then(resolve, reject);
  });
}

async function runWithTimeout<TValue>(
  run: (signal: AbortSignal) => Promise<TValue>,
  outer: AbortSignal,
  timeoutMs: number,
): Promise<TValue> {
  if (outer.aborted) throw outer.reason as Error; // never start work for a cancelled run
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
export function defineTool<TName extends string, TInput, TOutput>(
  definition: ToolDefinition<TName, TInput, TOutput>,
): Tool<TName, TInput, TOutput> {
  if (!TOOL_NAME.test(definition.name)) {
    throw new InvalidToolNameError(
      `Tool name "${definition.name}" must match ${String(TOOL_NAME)}`,
    );
  }
  const timeoutMs = definition.timeoutMs ?? DEFAULT_TOOL_TIMEOUT_MS;
  const invoke = async (raw: unknown, ctx: ToolContext): Promise<ToolResult<TOutput>> => {
    const input = definition.input.safeParse(raw);
    if (!input.success) return failure(`invalid input: ${describeIssues(input.error)}`);
    let produced: unknown;
    try {
      produced = await runWithTimeout(
        (signal) => definition.run(input.data, { ...ctx, signal }),
        ctx.signal,
        timeoutMs,
      );
    } catch (error) {
      return failure(errorMessage(error));
    }
    const output = definition.output.safeParse(produced);
    if (!output.success) return failure(`invalid output: ${describeIssues(output.error)}`);
    return { kind: "ok", value: output.data };
  };
  return {
    name: definition.name,
    description: definition.description,
    effect: definition.effect ?? "read",
    timeoutMs,
    input: definition.input,
    output: definition.output,
    invoke,
  };
}
