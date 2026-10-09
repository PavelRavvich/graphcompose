/** Where in an agent's loop a judge looks. */
export var JudgePoint;
(function (JudgePoint) {
  JudgePoint["BeforeToolCall"] = "beforeToolCall";
  JudgePoint["AfterToolCall"] = "afterToolCall";
  JudgePoint["BeforeAgentAnswer"] = "beforeAgentAnswer";
  JudgePoint["OnChannelDecision"] = "onChannelDecision";
})(JudgePoint || (JudgePoint = {}));
/** Whose judges look: the tool's own run first, then the agent's. */
export var JudgeOwner;
(function (JudgeOwner) {
  JudgeOwner["Tool"] = "tool";
  JudgeOwner["Agent"] = "agent";
})(JudgeOwner || (JudgeOwner = {}));
export const noJudges = () => Promise.resolve();
/** Visits a point for the tool's judges, then for the agent's. */
export function mergePolicies(wPolicies, aPolicies, tPolicies) {
  const wGuard = wPolicies ?? [];
  const combined = tPolicies?.override
    ? tPolicies.instances
    : [
        ...(aPolicies?.override ? [] : wGuard),
        ...(aPolicies?.instances ?? []),
        ...(tPolicies?.instances ?? []),
      ];
  const disabled = new Set([...(aPolicies?.disable ?? []), ...(tPolicies?.disable ?? [])]);
  if (disabled.size === 0) return combined;
  return combined.filter((g) => !disabled.has(g.constructor));
}
export async function visitToolThenAgent(guardrails, point, ctx, decision, observer, appState) {
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
export async function visitAgentAnswer(guardrails, ctx, observer, appState) {
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
