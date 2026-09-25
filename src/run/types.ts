import type { SpendLedger } from "../finops/ledger.js";
import type { CostReport } from "../finops/usage.js";
import type { GraphDeps } from "../graph/graph.js";
import type { PendingApproval } from "../pause/index.js";
import type { TernStore } from "../terns/index.js";
import type { RunTracing } from "../tracing/index.js";

/** Graph dependencies plus the daily spend ledger and the Tern store. */
export interface RunDeps<TName extends string> extends GraphDeps<TName> {
  readonly ledger: SpendLedger;
  readonly terns: TernStore;
  /** Optional tracing (e.g. local Langfuse); runs are identical without it. */
  readonly tracing?: RunTracing | undefined;
}

/** Which ledger account pays for a run and its daily cap. Default: the bundle itself. */
export interface SpendAccount {
  readonly key: string;
  readonly dailyCap: number;
}

export interface RunOptions {
  /** Id of the Tern this run replays (eval). */
  readonly replayOf?: string;
  readonly account?: SpendAccount;
  /** Aborts the run (graph and in-flight model calls), e.g. when the user presses Esc. */
  readonly signal?: AbortSignal | undefined;
}

/** How a run ended for its caller. Failures are thrown, not returned. */
export type RunStatus = "answered" | "guarded" | "paused";

export interface AgentRunResult {
  readonly status: RunStatus;
  readonly answer: string;
  /** Agents in the order they ran. */
  readonly route: readonly string[];
  readonly stopReason: string;
  readonly budgetUsd: number;
  readonly cost: CostReport;
  readonly threadId: string;
  readonly ternId: string;
  /** The conversation in the tracing UI (session = thread), when tracing is on. */
  readonly traceUrl?: string;
  /** Checkpoint id of this run — used to resume a paused run. */
  readonly runId: string;
  /** Present only when `status` is "paused": the tool call waiting for a human. */
  readonly pending?: PendingApproval;
}
