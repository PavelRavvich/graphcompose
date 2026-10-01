import type { Class } from "../components/injection.js";
import type { WorkflowStartText } from "../dto/standard/framework.js";
import { validate } from "../dto/schema.js";
import { workflowStartMetaOf } from "../graph/workflow-start.decorator.js";
import { runAgent } from "./run-agent.js";
import type { AgentRunResult, RunDeps, RunOptions } from "./types.js";

export class NotAWorkflowStartError extends Error {
  override name = "NotAWorkflowStartError";
}

/** Where a run continues: a thread id from an earlier result; omit to start a new conversation. */
export interface WorkflowStartRunOptions extends RunOptions {
  readonly threadId?: string;
}

/**
 * Starts a run at a workflow start with its input:
 * `runWorkflowStart(deps, ChatWorkflowStart, { text: "find jobs" })`. The input is checked against the
 * start's DTO; its `text` is the task.
 */
export async function runWorkflowStart<TName extends string>(
  deps: RunDeps<TName>,
  workflowStart: Class,
  input: WorkflowStartText,
  options: WorkflowStartRunOptions = {},
): Promise<AgentRunResult> {
  const meta = workflowStartMetaOf(workflowStart);
  if (meta === undefined) {
    throw new NotAWorkflowStartError(`${workflowStart.name} is not a @WorkflowStart`);
  }
  const startText = validate(meta.input, input);
  const { threadId, ...run } = options;
  const thread = threadId === undefined ? {} : { threadId };
  return runAgent({ task: startText.text, start: meta.name, ...thread }, deps, run);
}
