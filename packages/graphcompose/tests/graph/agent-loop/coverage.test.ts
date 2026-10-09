import { describe, it, expect } from "vitest";
import { makeAnswerNode } from "../../../src/graph/agent-loop/answer-node.js";
import { mergePolicies, visitToolThenAgent } from "../../../src/graph/agent-loop/judge-points.js";

describe("agent-loop coverage", () => {
  it("answer-node with non-string move content", async () => {
    const node = makeAnswerNode({
      agent: { name: "Agent1" } as any,
      workflowGuardrails: [],
      guardrails: () => [],
    } as any);

    const result = await node(
      { move: { content: [{ type: "text", text: "hello" }], text: "hello" }, runId: "run1" } as any,

      { configurable: { run_id: "run1" } } as any,
    );
    expect(result.reply).toBe("hello");
  });

  it("mergePolicies tPolicies override and disable", () => {
    class Guard1 {
      public x = 1;
    }
    class Guard2 {
      public x = 2;
    }

    const policies1 = mergePolicies([], undefined, {
      override: true,
      instances: [new Guard1()],
      disable: [],
    });
    expect(policies1.length).toBe(1);

    const policies2 = mergePolicies([new Guard1(), new Guard2()], undefined, {
      override: false,
      instances: [],
      disable: [Guard1 as any],
    });
    expect(policies2.length).toBe(1);
  });

  it("visitToolThenAgent override arguments", async () => {
    const guardrail = {
      beforeToolCall: async () => ({ overrideArguments: { a: 1 } }),
    };

    const ctx = { call: { args: null } } as any;

    await visitToolThenAgent([guardrail], "beforeToolCall" as any, ctx);

    expect(ctx.call.args).toEqual({ a: 1 });
  });
});
