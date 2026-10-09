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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
// eslint-disable-next-line complexity
export function mergePolicies(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wPolicies: readonly any[] | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aPolicies: { override: boolean; instances: readonly any[]; disable: readonly any[] } | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tPolicies?: { override: boolean; instances: readonly any[]; disable: readonly any[] },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  const wGuard = wPolicies ?? [];

  const combined = tPolicies?.override
    ? tPolicies.instances
    : [
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        ...(aPolicies?.override ? [] : wGuard),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        ...(aPolicies?.instances ?? []),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        ...(tPolicies?.instances ?? []),
      ];

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const disabled = new Set([...(aPolicies?.disable ?? []), ...(tPolicies?.disable ?? [])]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (disabled.size === 0) return combined as any[];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return combined.filter((g) => !disabled.has(g.constructor));
}

// eslint-disable-next-line complexity
export async function visitToolThenAgent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  guardrails: readonly any[] | undefined,
  point: JudgePoint,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  ctx: any,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  decision?: any,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  observer?: any,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  appState?: any,
): Promise<void> {
  if (!guardrails) return;
  for (const g of guardrails) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (typeof g[point] === "function") {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/prefer-nullish-coalescing
      const gName = g.constructor.name || "UnknownGuardrail";
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await observer?.onGuardrailStart({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        name: gName,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        input: { point, ctx, decision },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        state: appState,
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = await g[point](
        point === JudgePoint.OnChannelDecision ? decision : ctx,
        point === JudgePoint.OnChannelDecision ? ctx : undefined,
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (result && typeof result === "object" && result.overrideArguments) {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unsafe-member-access
        if (!ctx.call.args) ctx.call.args = {};
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        ctx.call.args = { ...ctx.call.args, ...result.overrideArguments };
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      await observer?.onGuardrailEnd({ name: gName, update: result, state: appState });
    }
  }
}

export async function visitAgentAnswer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  guardrails: readonly any[] | undefined,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  ctx: any,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  observer?: any,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  appState?: any,
): Promise<void> {
  if (!guardrails) return;
  for (const g of guardrails) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (typeof g.beforeAgentAnswer === "function") {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/prefer-nullish-coalescing
      const gName = g.constructor.name || "UnknownGuardrail";
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await observer?.onGuardrailStart({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        name: gName,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        input: { point: "beforeAgentAnswer", ctx },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        state: appState,
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = await g.beforeAgentAnswer(ctx);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      await observer?.onGuardrailEnd({ name: gName, update: result, state: appState });
    }
  }
}
