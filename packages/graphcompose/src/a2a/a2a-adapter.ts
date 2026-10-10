import type { App, ExecutionOptions, ExecutionOutput } from "../app/types.js";
import type { Class } from "../components/injection.js";
import type { WorkflowStartText } from "../dto/standard/framework.js";
import { eventOf, failureResponseOf, responseOf } from "./a2a-mapping.js";
import type {
  A2AEvent,
  A2AExecutionRequest,
  A2AExecutionResponse,
  A2AResumeRequest,
} from "./types.js";

/** Per call: the caller's signal and the execution context the app passes to tools. */
export type A2ACallOptions = Pick<ExecutionOptions, "signal" | "executionContext">;

/**
 * The inbound A2A boundary: a transport (`a2aHttpListener`, a framework's route) depends on this,
 * not on the app.
 */
export interface IA2AAdapter {
  execute(
    start: Class,
    req: A2AExecutionRequest,
    onEvent?: (event: A2AEvent) => void,
    options?: A2ACallOptions,
  ): Promise<A2AExecutionResponse>;

  resume(
    thread: string,
    req: A2AResumeRequest,
    onEvent?: (event: A2AEvent) => void,
    options?: A2ACallOptions,
  ): Promise<A2AExecutionResponse>;

  /** Stops the thread's run in flight through this adapter (→ `cancelled`) and cancels its pause. */
  cancel(thread: string): Promise<void>;
}

/**
 * Exposes an app's workflow over A2A: a request runs the workflow start, the response carries the
 * reply, the finish output and the final status; failures are statuses, not thrown errors.
 */
export class A2AAdapter implements IA2AAdapter {
  private readonly inFlight = new Map<string, AbortController>();

  constructor(private readonly app: App) {}

  public execute(
    start: Class,
    req: A2AExecutionRequest,
    onEvent?: (event: A2AEvent) => void,
    options: A2ACallOptions = {},
  ): Promise<A2AExecutionResponse> {
    return this.run(req.thread, options, (call) =>
      this.app.execute(start, req.input as WorkflowStartText, {
        ...call,
        ...(req.thread === undefined ? {} : { thread: req.thread }),
        ...streamTo(onEvent),
      }),
    );
  }

  public resume(
    thread: string,
    req: A2AResumeRequest,
    onEvent?: (event: A2AEvent) => void,
    options: A2ACallOptions = {},
  ): Promise<A2AExecutionResponse> {
    return this.run(thread, options, (call) =>
      this.app.resume(thread, req.decision, { ...call, ...streamTo(onEvent) }),
    );
  }

  public async cancel(thread: string): Promise<void> {
    this.inFlight.get(thread)?.abort(new Error(`thread "${thread}" was cancelled`));
    await this.app.cancel(thread);
  }

  /** Runs one call with its own abort controller (linked to the caller's signal), mapped to a response. */
  private async run(
    thread: string | undefined,
    options: A2ACallOptions,
    call: (options: A2ACallOptions) => Promise<ExecutionOutput>,
  ): Promise<A2AExecutionResponse> {
    const controller = new AbortController();
    const signal =
      options.signal === undefined
        ? controller.signal
        : AbortSignal.any([options.signal, controller.signal]);
    if (thread !== undefined) this.inFlight.set(thread, controller);
    try {
      return responseOf(await call({ ...options, signal }));
    } catch (error) {
      return failureResponseOf(error, signal, thread);
    } finally {
      if (thread !== undefined && this.inFlight.get(thread) === controller) {
        this.inFlight.delete(thread);
      }
    }
  }
}

const streamTo = (
  onEvent: ((event: A2AEvent) => void) | undefined,
): Pick<ExecutionOptions, "onStream"> =>
  onEvent === undefined
    ? {}
    : {
        onStream: (event) => {
          onEvent(eventOf(event));
        },
      };
