import { describe, expect, it, vi } from "vitest";
import type { EvalDeps } from "../../src/eval/eval.js";
import { replay } from "../../src/eval/replay.js";
import { runAgent, runVersions } from "../../src/index.js";
import type { Router } from "../../src/routers/index.js";
import { decide, fakeDeps, memoryLedger } from "../helpers.js";

const judgeWith = (...confidences: number[]): Router => {
  const route = vi.fn<Router["route"]>();
  for (const confidence of confidences) {
    route.mockResolvedValueOnce({
      kind: "decided",
      decision: { next: "adequate", reason: "", confidence },
    });
  }
  return { name: "judge", route };
};

describe("replay", () => {
  it("re-runs old tasks with the current prompts and compares scores", async () => {
    const script = {
      "test/router": [decide("alpha"), decide("finish"), decide("alpha"), decide("finish")],
      "test/alpha": ["old answer", "new answer"],
    };
    const deps = fakeDeps(script);
    await runAgent({ task: "Explain X" }, deps);
    const oldVersion = runVersions(deps).promptVersion;
    const changed = { ...deps, prompts: { ...deps.prompts, alpha: "You are alpha, now precise." } };
    const ledger = memoryLedger();
    const evaluation: EvalDeps = {
      terns: deps.terns,
      ledger,
      judge: judgeWith(0.6, 0.9),
      account: { key: "test-bundle:eval", dailyCap: 5 },
    };

    const report = await replay({ ...changed, ledger }, evaluation, {
      promptVersion: oldVersion,
      limit: 10,
    });

    expect(report).toMatchObject({ tasks: 1, replayed: 1, before: 0.6, after: 0.9 });
    expect((await deps.terns.summary("test-bundle")).map((row) => row.promptVersion)).toContain(
      runVersions(changed).promptVersion,
    );
  });

  it("stops replaying when the eval budget is spent", async () => {
    const deps = fakeDeps({ "test/router": [decide("finish")], "test/alpha": [] });
    await runAgent({ task: "T" }, deps);
    const evaluation: EvalDeps = {
      terns: deps.terns,
      ledger: memoryLedger(5),
      judge: judgeWith(),
      account: { key: "k", dailyCap: 5 },
    };

    const report = await replay({ ...deps, ledger: memoryLedger(5) }, evaluation, {
      promptVersion: runVersions(deps).promptVersion,
      limit: 10,
    });

    expect(report).toMatchObject({ replayed: 0, stoppedBy: "eval budget exhausted" });
  });
});
