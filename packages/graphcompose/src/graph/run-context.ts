import type { RunnableConfig } from "@langchain/core/runnables";

export interface RunContext {
  readonly runId: string;
  readonly threadId?: string;
  readonly metadata: Record<string, unknown>;
  readonly executionContext?: unknown;
  readonly branchCancelToken?: { cancelled: boolean };
}

export function extractRunContext(
  config: RunnableConfig | undefined,
  fallbackRunId: string,
): RunContext {
  const conf = (config?.configurable ?? {}) as Record<string, unknown>;
  return {
    runId:
      (conf.run_id as string | undefined) ?? (conf.runId as string | undefined) ?? fallbackRunId,
    threadId: (conf.thread_id as string | undefined) ?? (conf.threadId as string | undefined),
    metadata: (conf.metadata as Record<string, unknown> | undefined) ?? {},
    executionContext: conf.executionContext,
    branchCancelToken: conf.branchCancelToken as { cancelled: boolean } | undefined,
  };
}
