/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Class } from "../components/injection.js";
import type { WorkflowFinishText, WorkflowStartText } from "../dto/standard/framework.js";
import type { CostReport } from "../finops/usage.js";
import type { FlowNode } from "../graph/flow.js";
import type { PendingPause } from "../pause/index.js";
import type { AgentExecutionOutput, RunStreamEvent } from "../run/types.js";

/** Per call: the conversation to continue (omit for a new one) and a signal to stop the run. */

export interface FinishOutput {
  readonly kind: string;
}

export interface TextFinishOutput extends FinishOutput {
  readonly kind: "text";
  readonly text: string;
}

export interface MultimodalFinishOutput extends FinishOutput {
  readonly kind: "multimodal";
  // Content blocks: mixed text, tool calls, images, etc.
  readonly blocks: readonly any[];
}

export interface JsonFinishOutput<T = unknown> extends FinishOutput {
  readonly kind: "json";
  readonly data: T;
}

export interface ImageFinishOutput extends FinishOutput {
  readonly kind: "image";
  readonly mimeType: string;
  readonly data: Uint8Array;
}

export interface AudioFinishOutput extends FinishOutput {
  readonly kind: "audio";
  readonly mimeType: string;
  readonly data: Uint8Array;
}

export interface VideoFinishOutput extends FinishOutput {
  readonly kind: "video";
  readonly mimeType: string;
  readonly data: Uint8Array;
}

export interface BinaryFinishOutput extends FinishOutput {
  readonly kind: "binary";
  readonly mimeType: string;
  readonly data: Uint8Array;
}

export interface ExecutionOptions {
  readonly thread?: string;
  readonly signal?: AbortSignal | undefined;
  readonly onStream?: (event: RunStreamEvent) => void;
  readonly executionContext?: unknown;
}

/**
 * What one run (or resume) of the app ended with. `finish` / `output` when it reached a workflow
 * finish, `pause` when it waits for an approval; `path` = the flow nodes it visited, `spend` = its cost.
 */
export interface ExecutionOutput extends Pick<
  AgentExecutionOutput,
  "status" | "replyWith" | "route" | "stopReason" | "compacted" | "traceUrl"
> {
  readonly thread: string;
  /** The name of the workflow finish the run reached. */
  readonly finish?: string;
  readonly output?: WorkflowFinishText;
  readonly finishes?: Record<string, FinishOutput>;
  /** What the run waits for (until #117: the tool call waiting for approval). */
  readonly pause?: PendingPause;
  /** Flow nodes in the order the run visited them: node classes, or named nodes. */
  readonly path: readonly FlowNode[];
  readonly spend: CostReport;
}

/**
 * A workflow, built and started: its container, graph (all assembly errors at once) and
 * `onStart` hooks. `run` starts at a workflow start, `resume` continues a paused thread, `close`
 * runs `onStop` hooks and closes MCP connections.
 */
export interface App {
  readonly name: string;
  readonly version: string;
  /** Startup warnings, e.g. a config changed without a version bump. */
  readonly warnings: readonly string[];
  /** One line per model use: its provider, reasoning and caching (the startup log). */
  readonly models: readonly string[];
  /** The workflow start a plain text goes to (input `WorkflowStartText`), if the flow has one. */
  readonly textStart: Class | undefined;
  execute(
    start: Class,
    input: WorkflowStartText,
    options?: ExecutionOptions,
  ): Promise<ExecutionOutput>;
  resume(
    thread: string,
    decision: unknown,
    options?: Pick<ExecutionOptions, "signal" | "executionContext">,
  ): Promise<ExecutionOutput>;
  cancel(thread: string): Promise<void>;
  close(): Promise<void>;
}
