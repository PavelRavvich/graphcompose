import { WorkflowCancelledError } from "../core/errors.js";
import type { AppState } from "../core/observability.js";
import type { ObserverManager } from "../core/observer-manager.js";
import type { ExecutionOutput } from "./types.js";

const asError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

/**
 * One leg of a run (its `execute`, or a `resume`), observed: it paused → `onWorkflowPause`, it
 * finished → `onWorkflowEnd`, it threw → `onError` (and the error is rethrown).
 */
export async function observeLeg(
  observer: ObserverManager,
  state: AppState,
  leg: () => Promise<ExecutionOutput>,
): Promise<ExecutionOutput> {
  let result: ExecutionOutput;
  try {
    result = await leg();
  } catch (error) {
    await observer.onError(asError(error), state);
    throw error;
  }
  await (result.pause === undefined
    ? observer.onWorkflowEnd(result, state)
    : observer.onWorkflowPause({ pause: result.pause, state }));
  return result;
}

/** A paused run was cancelled instead of resumed: it ends as failed, `WorkflowCancelledError`. */
export function observeCancelledPause(observer: ObserverManager, state: AppState): Promise<void> {
  const thread = state.threadId ?? "";
  return observer.onError(
    new WorkflowCancelledError(`thread "${thread}" was cancelled while paused`),
    state,
  );
}
