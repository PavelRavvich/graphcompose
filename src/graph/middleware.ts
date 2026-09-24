import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { createMiddleware, type AgentMiddleware } from "langchain";
import type { ResolvedModelSettings } from "../config/types.js";
import { recordUsage, totalCost, type UsageRecord } from "../finops/usage.js";
import {
  BUDGET_STOP_MESSAGE,
  PAUSED_MESSAGE,
  PENDING_APPROVAL_MESSAGE,
} from "../prompts/agents.js";
import type { ApprovalRecord, PendingApproval } from "../pause/index.js";
import { stableJson } from "../terns/index.js";
import type { AnyTool } from "../tools/index.js";

export interface AccountingDeps {
  readonly agent: string;
  readonly settings: ResolvedModelSettings;
  /** The loop's records; also read by the node after the loop or on failure. */
  readonly records: UsageRecord[];
  /** Spent in this run before the agent started. */
  readonly spentBeforeUsd: number;
  readonly budgetUsd: number;
  /** True once a tool call waits for a human: the loop stops without another model call. */
  readonly isPaused: () => boolean;
}

/**
 * Around every model call of an agent loop: stops the loop when the run budget is spent (no
 * call made) and records the usage of every call that happened.
 */
export function accountingMiddleware(deps: AccountingDeps): AgentMiddleware {
  return createMiddleware({
    name: "Accounting",
    wrapModelCall: async (request, handler) => {
      if (deps.isPaused()) return new AIMessage(PAUSED_MESSAGE);
      if (deps.spentBeforeUsd + totalCost(deps.records) >= deps.budgetUsd) {
        return new AIMessage(BUDGET_STOP_MESSAGE);
      }
      const response = await handler(request);
      deps.records.push(recordUsage(deps.agent, deps.settings, response));
      return response;
    },
  });
}

export interface ApprovalDeps {
  readonly agent: string;
  readonly tools: readonly AnyTool[];
  readonly needsApproval: (tool: AnyTool) => boolean;
  /** Decisions already made in this run. */
  readonly approvals: readonly ApprovalRecord[];
  readonly onPending: (pending: PendingApproval) => void;
}

const sameCall = (record: ApprovalRecord, tool: string, args: unknown): boolean =>
  record.tool === tool && stableJson(record.args) === stableJson(args);

/**
 * Pause seam inside an agent loop: a call that needs a human is not executed — it is reported as
 * pending and the loop ends. A call a human already decided returns that decision's result.
 */
export function approvalMiddleware(deps: ApprovalDeps): AgentMiddleware {
  return createMiddleware({
    name: "Approval",
    wrapToolCall: (request, handler) => {
      const { name, args, id } = request.toolCall;
      const tool = deps.tools.find((candidate) => candidate.name === name);
      if (tool === undefined || !deps.needsApproval(tool)) return handler(request);
      const decided = deps.approvals.find((record) => sameCall(record, name, args));
      const content = decided?.result ?? PENDING_APPROVAL_MESSAGE;
      if (decided === undefined) deps.onPending({ agent: deps.agent, tool: name, args });
      return new ToolMessage({ content, tool_call_id: id ?? name });
    },
  });
}
