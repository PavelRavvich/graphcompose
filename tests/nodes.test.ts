import { describe, expect, it, vi } from "vitest";
import { makeAgentNode, UnknownAgentError } from "../src/graph/nodes/agent.js";
import { makeRouterNode, type RouterNodeDeps } from "../src/graph/nodes/router.js";
import { FINISH } from "../src/graph/state.js";
import type { RouteOutcome } from "../src/routers/index.js";
import { baseState, fakeDeps, usageRecord } from "./helpers.js";

const routerDeps = (outcome: RouteOutcome): RouterNodeDeps => ({
  router: { name: "main", route: vi.fn(() => Promise.resolve(outcome)) },
  options: [{ name: "alpha", description: "a" }],
  maxHops: 2,
  maxCostUsd: 0.01,
  historyLimit: 0,
});

const paid = usageRecord("router:main", 0.001);

describe("router node", () => {
  it("routes to the decided agent and records usage", async () => {
    const deps = routerDeps({
      kind: "decided",
      decision: { next: "alpha", reason: "r" },
      usage: paid,
    });

    const update = await makeRouterNode(deps)(baseState());

    expect(update).toEqual({ next: "alpha", routeReason: "r", usage: [paid] });
  });

  it("finishes with the failure reason when routing fails", async () => {
    const deps = routerDeps({ kind: "failed", reason: "router error: down", usage: paid });

    const update = await makeRouterNode(deps)(baseState());

    expect(update).toEqual({ next: FINISH, routeReason: "router error: down", usage: [paid] });
  });

  it("finishes without routing when max hops is reached", async () => {
    const deps = routerDeps({ kind: "failed", reason: "x", usage: paid });

    const update = await makeRouterNode(deps)(baseState({ hops: 2 }));

    expect(update).toEqual({ next: FINISH, routeReason: "max hops reached" });
    expect(deps.router.route).not.toHaveBeenCalled();
  });

  it("finishes without routing when the budget is exhausted", async () => {
    const deps = routerDeps({ kind: "failed", reason: "x", usage: paid });

    const update = await makeRouterNode(deps)(baseState({ usage: [usageRecord("alpha", 0.02)] }));

    expect(update).toEqual({ next: FINISH, routeReason: "budget exhausted" });
    expect(deps.router.route).not.toHaveBeenCalled();
  });
});

describe("agent node", () => {
  const agents = () => {
    const { registry, prompts } = fakeDeps({ "test/alpha": ["  alpha result  "] });
    const binding = registry.agents.get("alpha");
    if (binding === undefined) throw new Error("alpha binding missing");
    return {
      agents: new Map([
        [
          "alpha",
          { binding, systemPrompt: prompts.alpha, tools: [], maxToolCalls: 3, historyLimit: 0 },
        ],
      ]),
      bundle: "test-bundle",
      runBudgetCap: 1,
    };
  };

  it("adds a trimmed contribution, one hop and a usage record", async () => {
    const update = await makeAgentNode(agents())(baseState({ next: "alpha" }));

    expect(update.contributions).toEqual([{ agent: "alpha", content: "alpha result" }]);
    expect(update.hops).toBe(1);
    expect(update.usage).toHaveLength(1);
  });

  it("throws for an agent that is not configured", async () => {
    await expect(makeAgentNode(agents())(baseState({ next: "ghost" }))).rejects.toBeInstanceOf(
      UnknownAgentError,
    );
  });
});
