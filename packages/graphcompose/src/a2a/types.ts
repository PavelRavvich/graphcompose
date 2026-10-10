export type A2AStatus = "running" | "paused" | "finished" | "failed" | "cancelled";

/** Payload for initiating a new workflow execution through A2A. */
export interface A2AExecutionRequest<TInput = unknown> {
  readonly input: TInput;
}

/** Basic response indicating the identity and status of an execution. */
export interface A2AExecutionResponse {
  readonly thread: string;
  readonly status: A2AStatus;
}

/** Payload for resuming a paused execution. */
export interface A2AResumeRequest<TDecision = unknown> {
  readonly decision: TDecision;
}

/**
 * Strongly typed Server-Sent Events (SSE) payloads for A2A communication.
 * 'unknown' is used to enforce downstream validation (avoiding 'any').
 */
export type A2AEvent =
  | {
      readonly type: "progress";
      readonly payload: { readonly step: string; readonly content?: string };
    }
  | { readonly type: "pause"; readonly payload: { readonly reason: string } }
  | { readonly type: "finish"; readonly payload: { readonly result: unknown } }
  | {
      readonly type: "error";
      readonly payload: { readonly message: string; readonly code?: string };
    };
