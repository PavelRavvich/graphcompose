import type { BaseCheckpointSaver } from "@langchain/langgraph";
import { z } from "zod";
import type { AnyTool } from "../tools/index.js";

/**
 * The seam a project plugs in to pause a run for a human (e.g. before a write tool).
 * Off by default: without it the core never pauses. The core ships the rules; projects bring a
 * durable checkpointer and the channel that collects the human's decision.
 */
export interface PauseSeam {
  readonly checkpointer: BaseCheckpointSaver;
  readonly needsApproval: (tool: AnyTool) => boolean;
}

/** Default policy: tools that change the outside world need a human. */
export const writeToolsNeedApproval = (tool: AnyTool): boolean => tool.effect === "write";

/** A tool call waiting for a human. */
export interface PendingApproval {
  readonly agent: string;
  readonly tool: string;
  readonly args: unknown;
}

export const ApprovalDecisionSchema = z.object({
  approve: z.boolean(),
  note: z.string().optional(),
});

export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;

/** A decided call: approved (with the tool's result) or rejected (with the human's note). */
export interface ApprovalRecord extends PendingApproval {
  readonly approved: boolean;
  readonly result: string;
}
