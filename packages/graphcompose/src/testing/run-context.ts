import { newRunContext, type RunContext } from "../core/run-context.js";

/**
 * A `RunContext` for a tool or action called directly in a unit test (`ctx.run`): run `test`, its
 * own thread, a signal nobody aborts and no metadata unless given.
 */
export function testRunContext(
  context: {
    readonly runId?: string;
    readonly threadId?: string;
    readonly signal?: AbortSignal;
    readonly metadata?: Readonly<Record<string, string>>;
  } = {},
): RunContext {
  return newRunContext({ runId: "test", ...context });
}
