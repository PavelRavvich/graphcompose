import { describe, expect, it } from "vitest";
import { formatContributions, renderRouteInput } from "../src/graph/contributions.js";
import { finalize, NO_ANSWER } from "../src/graph/nodes/finalize.js";
import { AGENT_NODE, FINALIZE_NODE, routeAfterRouter } from "../src/graph/routing.js";
import { FINISH } from "../src/graph/state.js";
import { baseState } from "./helpers.js";

describe("routeAfterRouter", () => {
  it("goes to finalize on FINISH", () => {
    expect(routeAfterRouter({ next: FINISH })).toBe(FINALIZE_NODE);
  });

  it("goes to the agent node for an agent name", () => {
    expect(routeAfterRouter({ next: "alpha" })).toBe(AGENT_NODE);
  });
});

describe("finalize", () => {
  it("answers with the latest contribution", () => {
    const state = baseState({
      contributions: [
        { agent: "alpha", content: "draft" },
        { agent: "beta", content: "final" },
      ],
    });

    expect(finalize(state)).toEqual({ answer: "final" });
  });

  it("falls back when no agent contributed", () => {
    expect(finalize(baseState())).toEqual({ answer: NO_ANSWER });
  });
});

describe("formatContributions", () => {
  it("marks an empty history explicitly", () => {
    expect(formatContributions([])).toBe("(none yet)");
  });

  it("labels each contribution with its agent", () => {
    const text = formatContributions([{ agent: "alpha", content: "hi" }]);

    expect(text).toBe("[alpha]\nhi");
  });
});

describe("renderRouteInput", () => {
  it("renders task and contributions as plain router input", () => {
    expect(renderRouteInput("Fix it", [{ agent: "alpha", content: "done" }])).toBe(
      "Task:\nFix it\n\nContributions so far:\n[alpha]\ndone",
    );
  });
});
