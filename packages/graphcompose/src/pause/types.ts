import type { BaseCheckpointSaver } from "@langchain/langgraph";
import type { AnyTool } from "../tools/index.js";

/**
 * The seam a project plugs in to pause a run for an approval (e.g. before a write tool).
 * Off by default: without it the core never pauses. The core ships the rules; projects bring a
 * durable checkpointer and the channel that collects the approver's decision.
 */
export interface PauseSeam {
  readonly checkpointer: BaseCheckpointSaver;
  readonly needsApproval: (tool: AnyTool) => boolean;
}

/** Default policy: tools that change the outside world need an approval. */
export const writeToolsNeedApproval = (tool: AnyTool): boolean => tool.effect === "write";

/** A tool call waiting for an approval. */
export interface PendingApproval {
  readonly agent: string;
  readonly tool: string;
  readonly args: unknown;
}

/** A decided call: approved (with the tool's result) or rejected (with the decision's reason). */
export interface ApprovalRecord extends PendingApproval {
  readonly approved: boolean;
  /** Who or what decided (`ToolCallApprovalDecision.by`). */
  readonly by: string;
  readonly result: string;
}
