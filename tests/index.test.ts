import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { runAgent } from "../src/index.js";
import { decide, fakeDeps } from "./helpers.js";

const deps = () =>
  fakeDeps({ "test/router": [decide("alpha"), decide("finish", "done")], "test/alpha": ["42"] });

describe("runAgent", () => {
  it("returns answer, route, stop reason and cost report", async () => {
    const result = await runAgent({ task: "Answer" }, deps());

    expect(result).toMatchObject({
      answer: "42",
      route: ["alpha"],
      stopReason: "done",
      budgetUsd: 1,
    });
    expect(result.cost.calls).toBe(3);
  });

  it("rejects a blank task", async () => {
    await expect(runAgent({ task: "   " }, deps())).rejects.toBeInstanceOf(ZodError);
  });
});
