import { interrupt } from "@langchain/langgraph";
import type { UsageRecord } from "../../finops/usage.js";
import { ApprovalDecisionSchema } from "../../pause/index.js";
import { rejectionMessage } from "../../prompts/agents.js";
import { renderToolResult, type AnyTool, type ToolContext } from "../../tools/index.js";
import { recordToolCost } from "../../finops/usage.js";
import type { AgentStateType, AgentStateUpdate } from "../state.js";
import type { AsyncNode } from "../types.js";

export interface ApprovalNodeDeps {
  readonly tools: (name: string) => AnyTool;
  readonly bundle: string;
}

/**
 * Pauses the run (LangGraph `interrupt`) with the pending tool call. All spend before this point is
 * already in state and in the ledger. On resume: approved → the tool runs once here; rejected → the
 * rejection is recorded; either way the agent runs again and reads the decision.
 */
export function makeApprovalNode(
  deps: ApprovalNodeDeps,
): AsyncNode<AgentStateType, AgentStateUpdate> {
  return async (state) => {
    const pending = state.pending;
    if (pending === null) return {};
    const decision = ApprovalDecisionSchema.parse(interrupt(pending));
    const usage: UsageRecord[] = [];
    const ctx: ToolContext = {
      runId: state.runId,
      bundle: deps.bundle,
      agent: pending.agent,
      signal: new AbortController().signal,
      reportCost: (usd) => {
        usage.push(recordToolCost(pending.tool, usd));
      },
    };
    const result = decision.approve
      ? renderToolResult(await deps.tools(pending.tool).invoke(pending.args, ctx))
      : rejectionMessage(decision.note);
    return {
      pending: null,
      usage,
      approvals: [{ ...pending, approved: decision.approve, result }],
    };
  };
}
