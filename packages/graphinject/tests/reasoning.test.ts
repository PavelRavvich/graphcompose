import { FakeListChatModel } from "@langchain/core/utils/testing";
import { describe, expect, it, vi } from "vitest";
import type { ReasoningSettings } from "../src/config/types.js";
import { QualityNotReachedError } from "../src/graph/errors.js";
import { runAgent, type RunDeps } from "../src/index.js";
import { createModelRegistry, type ModelFactory } from "../src/llm/registry.js";
import { QUALITY_QUESTION } from "../src/prompts/agents.js";
import type { RouteRequest, Router } from "../src/routers/index.js";
import { ScriptedChatModel } from "./fakes/scripted-model.js";
import {
  decide,
  fakeDeps,
  memoryLedger,
  testConfig,
  usageRecord,
  type TestAgent,
} from "./helpers.js";

/** Judge: P(good) per attempt from `scores` (undefined = judge fails); criteria in `misses` fail. */
function judge(
  scores: (number | undefined)[],
  misses: readonly string[] = [],
  cost = 0.0001,
): Router {
  const queue = [...scores];
  const route = vi.fn((request: RouteRequest) => {
    const usage = usageRecord("router:quality:alpha", cost);
    if (request.instructions === QUALITY_QUESTION) {
      const p = queue.shift();
      if (p === undefined)
        return Promise.resolve({ kind: "failed" as const, reason: "down", usage });
      return Promise.resolve({
        kind: "decided" as const,
        decision: { next: "good", reason: "", confidence: p },
        usage,
      });
    }
    const missed = misses.some((c) => request.instructions?.includes(c) === true);
    return Promise.resolve({
      kind: "decided" as const,
      decision: { next: missed ? "no" : "yes", reason: "", confidence: 0.9 },
      usage,
    });
  });
  return { name: "quality:alpha", route };
}

const reasoning = (overrides: Partial<ReasoningSettings> = {}): ReasoningSettings => ({
  threshold: 0.8,
  maxAttempts: 3,
  thinking: ["low", "medium", "high"],
  ...overrides,
});

function setup(settings: ReasoningSettings, router: Router, runBudgetCap = 1) {
  const models = {
    low: new ScriptedChatModel(["a1", "a1b", "a1c"]),
    medium: new ScriptedChatModel(["a2"]),
    high: new ScriptedChatModel(["a3"]),
  };
  const factory = vi.fn<ModelFactory>((s) => {
    if (s.model !== "test/alpha") return new FakeListChatModel({ responses: ["x"] });
    return models[s.thinking as keyof typeof models];
  });
  const config = {
    ...testConfig,
    budget: { ...testConfig.budget, runBudgetCap },
    agents: { ...testConfig.agents, alpha: { ...testConfig.agents.alpha, reasoning: settings } },
  };
  const ledger = memoryLedger();
  const base = fakeDeps({ "test/router": [decide("alpha"), decide("finish", "done")] }, ledger);
  const deps: RunDeps<TestAgent> = {
    ...base,
    config,
    registry: createModelRegistry(config, factory),
    judges: new Map([["alpha", router]]),
  };
  return { deps, models, ledger };
}

describe("reasoning — quality-gated attempts", () => {
  it("AC1: returns at once when the threshold is met", async () => {
    const router = judge([0.9]);
    const { deps, models } = setup(reasoning(), router);

    const result = await runAgent({ task: "Parse ISO durations" }, deps);

    expect(result.answer).toBe("a1");
    expect(result.route).toEqual(["alpha"]);
    expect(result.attempts).toEqual([
      {
        agent: "alpha",
        attempt: 1,
        thinking: "low",
        score: 0.9,
        returned: true,
        reason: "threshold",
      },
    ]);
    expect(router.route).toHaveBeenCalledTimes(1);
    expect(models.medium.sent).toHaveLength(0);
  });

  it("AC2: retries with feedback and more thinking", async () => {
    const { deps, models } = setup(reasoning(), judge([0.5, 0.85], ["fully addresses"]));

    const result = await runAgent({ task: "Parse ISO durations" }, deps);

    expect(result.answer).toBe("a2");
    expect(result.attempts?.map((a) => [a.thinking, a.score, a.returned])).toEqual([
      ["low", 0.5, false],
      ["medium", 0.85, true],
    ]);
    const retryInput = models.medium.sent[0]?.at(-1)?.text ?? "";
    expect(retryInput).toContain("Your previous answer:\na1");
    expect(retryInput).toContain("falls short on:\n- The answer fully addresses the task.");
  });

  it("AC2: a thinking list shorter than the attempts repeats its last level", async () => {
    const { deps } = setup(reasoning({ thinking: ["low"] }), judge([0.1, 0.2, 0.3]));

    const result = await runAgent({ task: "T" }, deps);

    expect(result.attempts?.map((a) => a.thinking)).toEqual(["low", "low", "low"]);
  });

  it("AC3: exhausted — the best-scored attempt by default, the last when configured", async () => {
    const best = setup(reasoning(), judge([0.5, 0.7, 0.6]));
    const last = setup(reasoning({ onExhausted: "last" }), judge([0.5, 0.7, 0.6]));

    const bestResult = await runAgent({ task: "T" }, best.deps);
    const lastResult = await runAgent({ task: "T" }, last.deps);

    expect(bestResult.answer).toBe("a2");
    expect(bestResult.attempts?.find((a) => a.returned)).toMatchObject({
      attempt: 2,
      reason: "best",
    });
    expect(lastResult.answer).toBe("a3");
    expect(lastResult.attempts?.find((a) => a.returned)).toMatchObject({
      attempt: 3,
      reason: "last",
    });
  });

  it("AC3: judge failures never return early; best falls back to the last attempt", async () => {
    const { deps } = setup(reasoning(), judge([undefined, undefined, undefined]));

    const result = await runAgent({ task: "T" }, deps);

    expect(result.answer).toBe("a3");
    expect(result.attempts?.map((a) => a.score)).toEqual([null, null, null]);
  });

  it("AC4: fail — no answer, an explicit error with the best score, spend recorded, Tern failed", async () => {
    const { deps, ledger } = setup(reasoning({ onExhausted: "fail" }), judge([0.5, 0.6, 0.7]));

    const run = runAgent({ task: "T" }, deps);

    await expect(run).rejects.toBeInstanceOf(QualityNotReachedError);
    await expect(run).rejects.toThrow("best 0.70 < 0.8 after 3 attempts");
    expect(ledger.recorded.some((r) => r.caller === "router:quality:alpha")).toBe(true);
    expect((await deps.terns.summary("test-bundle"))[0]).toMatchObject({ terns: 1, scored: 0 });
  });

  it("AC5: attempts are kept in the Tern", async () => {
    const { deps } = setup(reasoning(), judge([0.5, 0.9]));

    const result = await runAgent({ task: "T" }, deps);

    const [tern] = await deps.terns.byIds([result.ternId]);
    expect(tern?.attempts).toEqual(result.attempts);
    expect(tern?.route).toEqual(["alpha"]);
  });

  it("AC6: respects the run budget — no attempt after it is spent", async () => {
    const { deps } = setup(reasoning(), judge([0.1, 0.9], [], 0.01), 0.005);

    const result = await runAgent({ task: "T" }, deps);

    expect(result.attempts).toHaveLength(1);
    expect(result.answer).toBe("a1");
  });
});
