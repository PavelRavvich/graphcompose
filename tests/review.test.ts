import { FakeListChatModel } from "@langchain/core/utils/testing";
import { describe, expect, it, vi } from "vitest";
import type { ReviewSettings } from "../src/config/types.js";
import { runAgent, type RunDeps } from "../src/index.js";
import { createModelRegistry, type ModelFactory } from "../src/llm/registry.js";
import type { RouteOutcome, Router } from "../src/routers/index.js";
import { ScriptedChatModel } from "./fakes/scripted-model.js";
import { decide, fakeDeps, testConfig, usageRecord, type TestAgent } from "./helpers.js";

const verdict = (next: "revise" | "accept", confidence = 0.9): RouteOutcome => ({
  kind: "decided",
  decision: { next, reason: "", confidence },
  usage: usageRecord("router:review:alpha", 0.0001),
});

function reviewer(...outcomes: RouteOutcome[]): Router {
  const route = vi.fn<Router["route"]>();
  outcomes.forEach((outcome) => route.mockResolvedValueOnce(outcome));
  route.mockResolvedValue(verdict("revise"));
  return { name: "review:alpha", route };
}

interface Setup {
  readonly review: ReviewSettings;
  readonly router: Router;
  readonly runBudgetCap?: number;
}

function setup({ review, router, runBudgetCap = 1 }: Setup) {
  const first = new ScriptedChatModel(["draft"]);
  const retry = new ScriptedChatModel(["better", "best"]);
  const factory = vi.fn<ModelFactory>((settings) => {
    if (settings.model !== "test/alpha") return new FakeListChatModel({ responses: ["x"] });
    return settings.thinking === review.thinkingOnRetry ? retry : first;
  });
  const config = {
    ...testConfig,
    budget: { ...testConfig.budget, runBudgetCap },
    agents: { ...testConfig.agents, alpha: { ...testConfig.agents.alpha, review } },
  };
  const base = fakeDeps({ "test/router": [decide("alpha"), decide("finish", "done")] });
  const deps: RunDeps<TestAgent> = {
    ...base,
    config,
    registry: createModelRegistry(config, factory),
    reviewers: new Map([["alpha", router]]),
  };
  return { deps, first, retry, factory };
}

const review = (overrides: Partial<ReviewSettings> = {}): ReviewSettings => ({
  threshold: 0.6,
  maxPasses: 1,
  thinkingOnRetry: "medium",
  ...overrides,
});

describe("review — a second pass decided by Jev", () => {
  it("runs another pass with thinking on when revise is above the threshold", async () => {
    const { deps, retry, factory } = setup({
      review: review(),
      router: reviewer(verdict("revise")),
    });

    const result = await runAgent({ task: "Hard task" }, deps);

    expect(result.answer).toBe("better");
    expect(result.route).toEqual(["alpha", "alpha (pass 2)"]);
    expect(factory).toHaveBeenCalledWith(
      expect.objectContaining({ model: "test/alpha", thinking: "medium" }),
    );
    expect(retry.sent[0]?.at(-1)?.text).toContain("Your previous answer:\ndraft");
  });

  it("accepts a good answer: one pass, only the review billed", async () => {
    const { deps, retry } = setup({ review: review(), router: reviewer(verdict("accept")) });

    const result = await runAgent({ task: "Easy task" }, deps);

    expect(result.route).toEqual(["alpha"]);
    expect(retry.sent).toHaveLength(0);
    expect(result.cost.byCaller["router:review:alpha"]).toBeCloseTo(0.0001);
  });

  it("treats revise below the threshold as accept", async () => {
    const { deps } = setup({ review: review(), router: reviewer(verdict("revise", 0.5)) });

    expect((await runAgent({ task: "T" }, deps)).route).toEqual(["alpha"]);
  });

  it("stops at maxPasses", async () => {
    const { deps } = setup({ review: review({ maxPasses: 1 }), router: reviewer() });

    expect((await runAgent({ task: "T" }, deps)).route).toEqual(["alpha", "alpha (pass 2)"]);
  });

  it("does not review at all with maxPasses 0", async () => {
    const router = reviewer();
    const { deps } = setup({ review: review({ maxPasses: 0 }), router });

    await runAgent({ task: "T" }, deps);

    expect(router.route).not.toHaveBeenCalled();
  });

  it("keeps the answer when the review fails", async () => {
    const { deps } = setup({
      review: review(),
      router: reviewer({ kind: "failed", reason: "jev down" }),
    });

    const result = await runAgent({ task: "T" }, deps);

    expect(result.answer).toBe("draft");
    expect(result.route).toEqual(["alpha"]);
  });

  it("respects the run budget: no review once it is spent", async () => {
    const router = reviewer();
    const { deps } = setup({ review: review(), router, runBudgetCap: 0.0004 });

    await runAgent({ task: "T" }, deps);

    expect(router.route).not.toHaveBeenCalled();
  });
});
