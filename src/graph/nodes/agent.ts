import { HumanMessage } from "@langchain/core/messages";
import { createAgent, toolCallLimitMiddleware, type AgentMiddleware } from "langchain";
import { recordToolCost, totalCost, type UsageRecord } from "../../finops/usage.js";
import { systemMessageFor } from "../../llm/cache.js";
import type { ModelBinding } from "../../llm/registry.js";
import { renderAgentInput } from "../../prompts/agents.js";
import { toLangChainTool, type AnyTool, type ToolContext } from "../../tools/index.js";
import { formatContributions, formatHistory } from "../contributions.js";
import { AgentFailedError, QualityNotReachedError } from "../errors.js";
import type { PendingApproval } from "../../pause/index.js";
import { accountingMiddleware, approvalMiddleware } from "../middleware.js";
import type { AgentStateType, AgentStateUpdate } from "../state.js";
import { runAttempts, type AgentReasoning, type AttemptRecord } from "./attempts.js";
import type { AsyncNode } from "../types.js";

/** Everything needed to run one configured agent. */
export interface AgentDefinition {
  readonly binding: ModelBinding;
  readonly systemPrompt: string;
  readonly tools: readonly AnyTool[];
  readonly maxToolCalls: number;
  readonly historyLimit: number;
  /** Quality-gated attempts (config `reasoning`). */
  readonly reasoning?: AgentReasoning | undefined;
}

export interface AgentNodeDeps {
  readonly agents: ReadonlyMap<string, AgentDefinition>;
  readonly bundle: string;
  readonly runBudgetCap: number;
  /** Set only with a pause seam: which tools wait for a human. */
  readonly needsApproval?: ((tool: AnyTool) => boolean) | undefined;
}

export class UnknownAgentError extends Error {
  override name = "UnknownAgentError";
  constructor(agent: string) {
    super(`Unknown agent: ${agent}`);
  }
}

/** One run of an agent: who, with which model, on which input, spending into which records. */
interface Pass {
  readonly state: AgentStateType;
  readonly agent: AgentDefinition;
  readonly deps: AgentNodeDeps;
  readonly records: UsageRecord[];
  /** Set when a tool call waits for a human; the loop then stops. */
  readonly pending: { value?: PendingApproval };
}

/** Per tool: its reported cost lands in the loop's records, next to the model calls. */
function toolContext(pass: Pass, tool: AnyTool): ToolContext {
  return {
    runId: pass.state.runId,
    bundle: pass.deps.bundle,
    agent: pass.state.next,
    signal: new AbortController().signal,
    reportCost: (usd) => {
      pass.records.push(recordToolCost(tool.name, usd));
    },
  };
}

const budgetOf = (pass: Pass): number => Math.min(pass.deps.runBudgetCap, pass.state.budgetUsd);
const hasBudget = (pass: Pass): boolean =>
  totalCost(pass.state.usage) + totalCost(pass.records) < budgetOf(pass);

/** The pause seam's middleware, only when the run has one. */
function approvalFor(pass: Pass): AgentMiddleware[] {
  const needsApproval = pass.deps.needsApproval;
  if (needsApproval === undefined) return [];
  return [
    approvalMiddleware({
      agent: pass.state.next,
      tools: pass.agent.tools,
      needsApproval,
      approvals: pass.state.approvals,
      onPending: (pending) => {
        pass.pending.value = pending;
      },
    }),
  ];
}

/** The model ↔ tool loop (createAgent) with usage, budget and fail-fast tool limit. */
async function runLoop(pass: Pass, binding: ModelBinding, input: string): Promise<string> {
  const loop = createAgent({
    model: binding.model,
    tools: pass.agent.tools.map((tool) => toLangChainTool(tool, toolContext(pass, tool))),
    systemPrompt: systemMessageFor(pass.agent.systemPrompt, binding.settings),
    middleware: [
      accountingMiddleware({
        agent: pass.state.next,
        settings: binding.settings,
        records: pass.records,
        spentBeforeUsd: totalCost(pass.state.usage),
        budgetUsd: budgetOf(pass),
        isPaused: () => pass.pending.value !== undefined,
      }),
      toolCallLimitMiddleware({ runLimit: pass.agent.maxToolCalls, exitBehavior: "error" }),
      ...approvalFor(pass),
    ],
  });
  const result = await loop.invoke({ messages: [new HumanMessage(input)] });
  return result.messages.at(-1)?.text.trim() ?? "";
}

/** One answer, or quality-gated attempts when the agent has `reasoning`. */
async function answer(
  pass: Pass,
  input: string,
): Promise<{ content: string; attempts: AttemptRecord[] }> {
  const reasoning = pass.agent.reasoning;
  if (reasoning === undefined) {
    return { content: await runLoop(pass, pass.agent.binding, input), attempts: [] };
  }
  const result = await runAttempts(
    {
      agent: pass.state.next,
      task: pass.state.task,
      records: pass.records,
      run: (model, text) => runLoop(pass, model, text),
      paused: () => pass.pending.value !== undefined,
      hasBudget: () => hasBudget(pass),
    },
    reasoning,
    input,
  );
  return result ?? { content: "", attempts: [] };
}

/**
 * Runs the agent the router picked with its own model, prompt, thinking, cache, tools and optional
 * review. Crossing maxToolCalls fails fast; the spend travels with the failure to the ledger.
 */
export function makeAgentNode(deps: AgentNodeDeps): AsyncNode<AgentStateType, AgentStateUpdate> {
  return async (state) => {
    const agent = deps.agents.get(state.next);
    if (agent === undefined) throw new UnknownAgentError(state.next);
    const pass: Pass = { state, agent, deps, records: [], pending: {} };
    const input = renderAgentInput(
      state.task,
      formatContributions(state.contributions),
      formatHistory(state.history, agent.historyLimit),
    );
    try {
      const { content, attempts } = await answer(pass, input);
      const pending = pass.pending.value;
      if (pending !== undefined) return { usage: pass.records, pending };
      return {
        hops: 1,
        contributions: [{ agent: state.next, content }],
        usage: pass.records,
        attempts,
      };
    } catch (error) {
      if (error instanceof QualityNotReachedError) throw error;
      throw new AgentFailedError(state.next, pass.records, error);
    }
  };
}
