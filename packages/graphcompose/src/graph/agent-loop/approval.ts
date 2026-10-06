import { interrupt } from "@langchain/langgraph";
import { validate } from "../../dto/schema.js";
import {
  ToolCallApprovalDecision,
  type ToolCallApprovalAsk,
} from "../../dto/standard/framework.js";
import type { PendingPause } from "../../pause/index.js";
import type { AnyTool } from "../../tools/index.js";

/**
 * How the loop gets a decision on a tool call before it runs — one call per ask. Until #152 wires it
 * to channels, it is backed by the pause seam: the run pauses and `resume` brings the decision.
 */
export interface ToolCallApproval {
  readonly needsApproval: (tool: AnyTool) => boolean;
  readonly requestApproval: (
    ask: ToolCallApprovalAsk,
    agent: string,
  ) => Promise<ToolCallApprovalDecision>;
}

/**
 * The pause seam as an approval: `interrupt` pauses the run at the call (the checkpoint is the
 * boundary — nothing ran before it), the decision `resume` brings is validated like any external input.
 */
export function pauseSeamApproval(needsApproval: (tool: AnyTool) => boolean): ToolCallApproval {
  return {
    needsApproval,
    requestApproval: (ask, agent) => {
      const pending: PendingPause = {
        kind: "approval",
        agent,
        callId: ask.callId,
        tool: ask.tool,
        args: ask.arguments,
      };
      return Promise.resolve(validate(ToolCallApprovalDecision, interrupt(pending)));
    },
  };
}
