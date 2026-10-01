import { describe, expect, it } from "vitest";
import { END } from "@langchain/langgraph";
import { formatContributions, renderRouteInput } from "../src/graph/contributions.js";
import { afterAgent } from "../src/graph/nodes/agent-loop.js";
import { lastAnswer, NO_ANSWER } from "../src/graph/nodes/finalize.js";
import { baseState } from "./helpers.js";

describe("afterAgent (the agent loop)", () => {
  it("goes to approval when a tool call waits for a human", () => {
    expect(afterAgent({ pending: { agent: "alpha", tool: "send", args: {} } })).toBe("approval");
  });

  it("ends the loop otherwise", () => {
    expect(afterAgent({ pending: null })).toBe(END);
  });
});

describe("lastAnswer (a workflow finish's answer)", () => {
  it("answers with the latest contribution", () => {
    const state = baseState({
      contributions: [
        { agent: "alpha", content: "draft" },
        { agent: "beta", content: "final" },
      ],
    });

    expect(lastAnswer(state)).toBe("final");
  });

  it("falls back when no agent contributed", () => {
    expect(lastAnswer(baseState())).toBe(NO_ANSWER);
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
