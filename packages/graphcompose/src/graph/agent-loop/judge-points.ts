import type { ToolCallRequest } from "./deps.js";

/** Where in an agent's loop a judge looks. */
export enum JudgePoint {
  BeforeToolCall = "beforeToolCall",
  AfterToolCall = "afterToolCall",
  BeforeAgentAnswer = "beforeAgentAnswer",
  OnChannelDecision = "onChannelDecision",
}

/** Whose judges look: the tool's own run first, then the agent's. */
export enum JudgeOwner {
  Tool = "tool",
  Agent = "agent",
}

/** One visit of a judge point: where, whose judges, which agent, which call (none before the replyWith). */
export interface JudgeVisit {
  readonly point: JudgePoint;
  readonly owner: JudgeOwner;
  readonly agent: string;
  readonly call?: ToolCallRequest;
  readonly decision?: {
    approved: boolean;
    by?: string;
    feedback?: string;
    overrideArguments?: any;
  };
}

/**
 * The extension points of the move boundary, visited in order: tool judges `beforeToolCall` → agent
 * judges `beforeToolCall` → approval → run → `afterToolCall` (tool, then agent); `beforeAgentAnswer`
 * before the replyWith leaves the loop. Empty here — the judges themselves come with #123.
 */
export type JudgePoints = (visit: JudgeVisit) => Promise<void>;

export const noJudges: JudgePoints = () => Promise.resolve();

/** Visits a point for the tool's judges, then for the agent's. */
export function mergePolicies(
  wPolicies: readonly any[] | undefined,
  aPolicies: { override: boolean; instances: readonly any[]; disable: readonly any[] } | undefined,
  tPolicies?: { override: boolean; instances: readonly any[]; disable: readonly any[] },
): any[] {
  const wGuard = wPolicies ?? [];

  const combined = tPolicies?.override
    ? tPolicies.instances
    : [
        ...(aPolicies?.override ? [] : wGuard),
        ...(aPolicies?.instances ?? []),
        ...(tPolicies?.instances ?? []),
      ];

  const disabled = new Set([...(aPolicies?.disable ?? []), ...(tPolicies?.disable ?? [])]);
  if (disabled.size === 0) return combined as any[];
  return combined.filter((g) => !disabled.has(g.constructor));
}

export async function visitToolThenAgent(
  guardrails: readonly any[] | undefined,
  point: JudgePoint,
  ctx: any,
  decision?: any,
  observer?: any,
  appState?: any,
): Promise<void> {
  if (!guardrails) return;
  for (const g of guardrails) {
    if (typeof g[point] === "function") {
      const gName = g.constructor.name || "UnknownGuardrail";
      await observer?.onGuardrailStart({
        name: gName,
        input: { point, ctx, decision },
        state: appState,
      });
      const result = await g[point](
        point === JudgePoint.OnChannelDecision ? decision : ctx,
        point === JudgePoint.OnChannelDecision ? ctx : undefined,
      );
      if (result && typeof result === "object" && result.overrideArguments) {
        if (!ctx.call.args) ctx.call.args = {};
        ctx.call.args = { ...ctx.call.args, ...result.overrideArguments };
      }
      await observer?.onGuardrailEnd({ name: gName, update: result, state: appState });
    }
  }
}

export async function visitAgentAnswer(
  guardrails: readonly any[] | undefined,
  ctx: any,
  observer?: any,
  appState?: any,
): Promise<void> {
  if (!guardrails) return;
  for (const g of guardrails) {
    if (typeof g.beforeAgentAnswer === "function") {
      const gName = g.constructor.name || "UnknownGuardrail";
      await observer?.onGuardrailStart({
        name: gName,
        input: { point: "beforeAgentAnswer", ctx },
        state: appState,
      });
      const result = await g.beforeAgentAnswer(ctx);
      await observer?.onGuardrailEnd({ name: gName, update: result, state: appState });
    }
  }
}
