import type { AIMessage } from "@langchain/core/messages";
import type { ModelBinding } from "../../llm/registry.js";
import type { KnowledgeSource } from "../../rag/types.js";
import type { AnyTool } from "../../tools/index.js";
import type { ToolCallApproval } from "./approval.js";
import type { JudgePoints } from "./judge-points.js";
import type { AgentLoopLimits } from "./limits.js";

/** Everything needed to run one configured agent. */
export interface AgentDefinition {
  readonly name: string;
  readonly binding: ModelBinding;
  readonly systemPrompt: string;
  readonly tools: readonly AnyTool[];
  readonly limits: AgentLoopLimits;
  readonly historyLimit: number;
  readonly summariesLimit: number;
  /** Context-mode knowledge bases: retrieved before the first model call. */
  readonly knowledge: readonly KnowledgeSource[];
}

/** What an agent's loop is built from. */
export interface AgentLoopDeps {
  readonly agent: AgentDefinition;
  readonly bundle: string;
  readonly runBudgetCap: number;
  /** Set only with a pause seam: which calls wait for a decision, and how it is asked. */
  readonly approval?: ToolCallApproval | undefined;
  readonly judges: JudgePoints;
}

/** One tool call of a move, with its id (assigned by the loop when the model gives none). */
export interface LoopCall {
  readonly callId: string;
  readonly tool: string;
  readonly args: Record<string, unknown>;
}

/** The tool calls of a move, in the model's order. */
export const callsOf = (move: AIMessage | null): LoopCall[] =>
  (move?.tool_calls ?? []).map((call) => ({
    callId: call.id ?? "",
    tool: call.name,
    args: call.args,
  }));

export const toolNamed = (agent: AgentDefinition, name: string): AnyTool | undefined =>
  agent.tools.find((tool) => tool.name === name);
