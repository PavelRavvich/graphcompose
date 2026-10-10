import type { App, ExecutionOptions, ExecutionOutput } from "../app/types.js";
import type { Class } from "../components/injection.js";
import type { RunStreamEvent } from "../run/types.js";
import type {
  A2AEvent,
  A2AExecutionRequest,
  A2AExecutionResponse,
  A2AResumeRequest,
} from "./types.js";

/**
 * Defines the inbound A2A boundary (SOLID: Interface Segregation).
 * Implementing frameworks (Express, Nest) depend on this abstraction, not concrete internals.
 */
export interface IA2AAdapter {
  execute(
    start: Class,
    req: A2AExecutionRequest,
    onEvent?: (event: A2AEvent) => void,
    options?: Pick<ExecutionOptions, "thread" | "signal" | "executionContext" | "configurable">,
  ): Promise<A2AExecutionResponse>;

  resume(
    thread: string,
    req: A2AResumeRequest,
    onEvent?: (event: A2AEvent) => void,
    options?: Pick<ExecutionOptions, "signal" | "executionContext">,
  ): Promise<A2AExecutionResponse>;

  cancel(thread: string): Promise<void>;
}

/**
 * Concrete implementation mapping external A2A semantics to internal App concepts.
 * (SOLID: Single Responsibility - mapping boundary).
 */
export class A2AAdapter implements IA2AAdapter {
  constructor(private readonly app: App) {}

  public async execute(
    start: Class,
    req: A2AExecutionRequest,
    onEvent?: (event: A2AEvent) => void,
    options?: Pick<ExecutionOptions, "thread" | "signal" | "executionContext" | "configurable">,
  ): Promise<A2AExecutionResponse> {
    const wrappedOptions: ExecutionOptions = {
      ...options,
      onStream: onEvent
        ? (e) => {
            onEvent(this.mapEvent(e));
          }
        : undefined,
    };

    try {
      const output = await this.app.execute(start, req.input as never, wrappedOptions);
      return this.mapOutputToResponse(output);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { thread: options?.thread ?? "unknown", status: "cancelled" };
      }
      throw err;
    }
  }

  public async resume(
    thread: string,
    req: A2AResumeRequest,
    onEvent?: (event: A2AEvent) => void,
    options?: Pick<ExecutionOptions, "signal" | "executionContext">,
  ): Promise<A2AExecutionResponse> {
    const wrappedOptions: ExecutionOptions = {
      ...options,
      onStream: onEvent
        ? (e) => {
            onEvent(this.mapEvent(e));
          }
        : undefined,
    };

    try {
      const output = await this.app.resume(thread, req.decision, wrappedOptions);
      return this.mapOutputToResponse(output);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { thread, status: "cancelled" };
      }
      throw err;
    }
  }

  public async cancel(thread: string): Promise<void> {
    await this.app.cancel(thread);
  }

  /** Maps internal RunStreamEvent to the standardized A2AEvent protocol. */
  private mapEvent(internal: RunStreamEvent): A2AEvent {
    // Basic mapping example (expandable based on full RunStreamEvent definition)
    if (internal.kind === "toolCall") {
      return { type: "progress", payload: { step: "tool", content: JSON.stringify(internal) } };
    } else {
      return { type: "progress", payload: { step: "agent", content: "message" } };
    }
    return { type: "progress", payload: { step: "unknown" } };
  }

  private mapOutputToResponse(output: ExecutionOutput): A2AExecutionResponse {
    let status: A2AExecutionResponse["status"] = "running";
    if (output.status === "paused") status = "paused";
    if (output.status === "answered" || output.status === "guarded") status = "finished";

    return {
      thread: output.thread,
      status,
    };
  }
}
