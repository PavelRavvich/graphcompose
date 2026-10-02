import type { RunnableConfig } from "@langchain/core/runnables";
import { recordReportedCost, type UsageRecord } from "../../finops/usage.js";
import { renderToolResult, type AnyTool, type ToolContext } from "../../tools/index.js";
import { toolNamed, type AgentLoopDeps } from "./deps.js";
import type { AgentLoopUpdate, ToolTask } from "./state.js";

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** The run's signal combined with the tool's own timeout. */
const signalFor = (tool: AnyTool, config: RunnableConfig | undefined): AbortSignal => {
  const timeout = AbortSignal.timeout(tool.timeoutMs);
  return config?.signal === undefined ? timeout : AbortSignal.any([config.signal, timeout]);
};

/** Tool failures are recoverable: whatever went wrong, the model reads it as `Tool error: …`. */
async function runTool(tool: AnyTool, args: unknown, context: ToolContext): Promise<string> {
  try {
    return renderToolResult(await tool.invoke(args, context));
  } catch (error) {
    return renderToolResult({ kind: "error", message: errorMessage(error) });
  }
}

/**
 * One tool call = one task (`Send`): its result is stored under its call id as soon as it finishes,
 * so a crash later never repeats it. A call running when the process died runs again with the same
 * `callId` — the tool's idempotency key. Reported costs land in the loop's usage.
 */
export function makeToolNode(
  deps: AgentLoopDeps,
): (task: ToolTask, config?: RunnableConfig) => Promise<AgentLoopUpdate> {
  return async (task, config) => {
    const tool = toolNamed(deps.agent, task.tool);
    if (tool === undefined) return {};
    const usage: UsageRecord[] = [];
    const context: ToolContext = {
      runId: task.runId,
      workflow: deps.bundle,
      agent: deps.agent.name,
      callId: task.callId,
      signal: signalFor(tool, config),
      reportCost: (usd) => {
        usage.push(recordReportedCost(tool, usd));
      },
    };
    const content = await runTool(tool, task.args, context);
    return { results: { [task.callId]: { callId: task.callId, tool: task.tool, content } }, usage };
  };
}
