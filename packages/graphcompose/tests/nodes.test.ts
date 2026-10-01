import { describe, expect, it, vi } from "vitest";
import { makeAgentNode, UnknownAgentError } from "../src/graph/nodes/agent.js";
import { AFTER_HUMAN_DECISION, makeFlowRouterNode } from "../src/graph/nodes/flow-router.js";
import type { RouteOutcome, RouteRequest } from "../src/routers/index.js";
import { testRouters } from "./fixtures/test-flow/test.flow.js";
import { baseState, fakeDeps, flowState } from "./helpers.js";

describe("agent node", () => {
  const agents = () => {
    const { registry, prompts } = fakeDeps({ "test/alpha": ["  alpha result  "] });
    const binding = registry.agents.get("alpha");
    if (binding === undefined) throw new Error("alpha binding missing");
    return {
      agents: new Map([
        [
          "alpha",
          {
            binding,
            systemPrompt: prompts.alpha,
            tools: [],
            maxToolCalls: 3,
            historyLimit: 0,
            summariesLimit: 0,
          },
        ],
      ]),
      bundle: "test-bundle",
      runBudgetCap: 1,
    };
  };

  it("adds a trimmed contribution and a usage record", async () => {
    const update = await makeAgentNode(agents())(baseState({ next: "alpha" }));

    expect(update.contributions).toEqual([{ agent: "alpha", content: "alpha result" }]);
    expect(update.usage).toHaveLength(1);
  });

  it("throws for an agent that is not configured", async () => {
    await expect(makeAgentNode(agents())(baseState({ next: "ghost" }))).rejects.toBeInstanceOf(
      UnknownAgentError,
    );
  });
});

describe("after a human decision the turn ends (#100)", () => {
  const [loaded] = testRouters;
  if (loaded === undefined) throw new Error("test router missing");
  const routerNode = () => {
    const route = vi.fn<(request: RouteRequest) => Promise<RouteOutcome>>(() =>
      Promise.resolve({ kind: "decided", decision: { next: "alpha", reason: "again" } }),
    );
    const node = makeFlowRouterNode({
      router: { name: "main", route },
      loaded,
      memory: { summaries: 0, turns: 0 },
      conclusion: "answer",
    });
    return { node, route };
  };
  const decision = (approved: boolean) => ({
    agent: "alpha",
    tool: "note_save",
    args: { text: "x" },
    approved,
    result: approved ? "{}" : "Tool error: rejected by human",
  });
  const answered = [{ agent: "alpha", content: "not saved" }];

  it("AC1 (#100): after a rejected call and the agent's answer — the answer, the router is not asked", async () => {
    const { node, route } = routerNode();

    const update = await node(flowState({ contributions: answered, approvals: [decision(false)] }));

    expect(update).toEqual({ next: "answer", routeReason: AFTER_HUMAN_DECISION });
    expect(route).not.toHaveBeenCalled();
  });

  it("AC2 (#100): after an approved call and the agent's answer — the same", async () => {
    const { node, route } = routerNode();

    expect(
      await node(flowState({ contributions: answered, approvals: [decision(true)] })),
    ).toMatchObject({ next: "answer" });
    expect(route).not.toHaveBeenCalled();
  });

  it("AC3 (#100): without human decisions the router decides as before", async () => {
    const { node, route } = routerNode();

    expect(await node(flowState({ contributions: answered }))).toMatchObject({
      next: "alpha",
      routeReason: "again",
    });
    expect(route).toHaveBeenCalledTimes(1);
  });
});
