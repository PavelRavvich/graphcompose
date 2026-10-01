import type { Class } from "../components/injection.js";
import type {
  ToolCallApprovalDecision,
  WorkflowFinishText,
  WorkflowStartText,
} from "../dto/standard/framework.js";
import type { CostReport } from "../finops/usage.js";
import type { FlowNode } from "../graph/flow.js";
import type { PendingApproval } from "../pause/index.js";
import type { AgentRunResult } from "../run/types.js";

/** Per call: the conversation to continue (omit for a new one) and a signal to stop the run. */
export interface RunCallOptions {
  readonly thread?: string;
  readonly signal?: AbortSignal | undefined;
}

/**
 * What one run (or resume) of the app ended with. `finish` / `output` when it reached a workflow
 * finish, `pause` when it waits for an approval; `path` = the flow nodes it visited, `spend` = its cost.
 */
export interface RunResult extends Pick<
  AgentRunResult,
  "status" | "answer" | "route" | "stopReason" | "attempts" | "compacted" | "traceUrl"
> {
  readonly thread: string;
  /** The name of the workflow finish the run reached. */
  readonly finish?: string;
  /** The finish's data. */
  readonly output?: WorkflowFinishText;
  /** What the run waits for (until #117: the tool call waiting for approval). */
  readonly pause?: PendingApproval;
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
  /** The workflow start a plain text goes to (input `WorkflowStartText`), if the flow has one. */
  readonly textStart: Class | undefined;
  run(start: Class, input: WorkflowStartText, options?: RunCallOptions): Promise<RunResult>;
  resume(
    thread: string,
    decision: ToolCallApprovalDecision,
    options?: Pick<RunCallOptions, "signal">,
  ): Promise<RunResult>;
  close(): Promise<void>;
}
