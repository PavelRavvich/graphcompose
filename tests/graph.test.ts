import { describe, expect, it } from "vitest";
import { buildGraph, MissingAgentPromptError } from "../src/graph/graph.js";
import { decide, fakeDeps } from "./helpers.js";

describe("buildGraph", () => {
  it("routes through agents and finishes with the last contribution", async () => {
    const deps = fakeDeps({
      "test/router": [decide("alpha"), decide("beta"), decide("finish", "done")],
      "test/alpha": ["facts"],
      "test/beta": ["code"],
    });

    const state = await buildGraph(deps).invoke({ task: "Explain and implement" });

    expect(state.contributions.map((item) => item.agent)).toEqual(["alpha", "beta"]);
    expect(state.answer).toBe("code");
    expect(state.routeReason).toBe("done");
    expect(state.usage.map((record) => record.caller)).toEqual([
      "router:main",
      "alpha",
      "router:main",
      "beta",
      "router:main",
    ]);
  });

  it("stops at max hops even if the router keeps routing", async () => {
    const deps = fakeDeps({
      "test/router": [decide("alpha"), decide("alpha"), decide("alpha"), decide("alpha")],
      "test/alpha": ["1", "2", "3", "4"],
    });

    const state = await buildGraph(deps).invoke({ task: "Loop" });

    expect(state.hops).toBe(3);
    expect(state.routeReason).toBe("max hops reached");
  });

  it("fails fast when an agent has no prompt", () => {
    const deps = { ...fakeDeps({}), prompts: { alpha: "only alpha" } };

    // @ts-expect-error — the type system already forbids a missing prompt; this checks runtime too
    expect(() => buildGraph(deps)).toThrow(MissingAgentPromptError);
  });
});
