import { describe, expect, it } from "vitest";
import { createAppDeps } from "../../src/app.js";
import { runAgent } from "../../src/index.js";

// Real models via OpenRouter. Only via `make smoke`, skipped without a key. Never in CI.
describe.skipIf(!process.env.OPENROUTER_API_KEY)("smoke: real models", () => {
  it("routes a simple task and stays within budget", async () => {
    const result = await runAgent(
      { task: "What is 2+2? Reply with the number only." },
      createAppDeps(),
    );

    expect(result.answer).toContain("4");
    expect(result.cost.totalUsd).toBeLessThan(0.05);
  });
});
