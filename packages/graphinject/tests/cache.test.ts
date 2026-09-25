import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { describe, expect, it } from "vitest";
import { needsCacheBreakpoint, systemMessageFor, withCacheBreakpoint } from "../src/llm/cache.js";
import { AgentFailedError } from "../src/graph/errors.js";

const messages = () => [new SystemMessage("stable prefix"), new HumanMessage("question")];

describe("prompt caching", () => {
  it("needs explicit breakpoints only for providers without automatic caching", () => {
    expect(needsCacheBreakpoint({ model: "anthropic/claude-sonnet-4.5", cache: true })).toBe(true);
    expect(needsCacheBreakpoint({ model: "moonshotai/kimi-k2.6", cache: true })).toBe(false);
    expect(needsCacheBreakpoint({ model: "anthropic/claude-sonnet-4.5", cache: false })).toBe(
      false,
    );
  });

  it("marks the system prompt with cache_control when needed", () => {
    const [system, human] = withCacheBreakpoint(messages(), {
      model: "google/gemini-3.5-flash",
      cache: true,
    });

    expect(system?.content).toEqual([
      { type: "text", text: "stable prefix", cache_control: { type: "ephemeral" } },
    ]);
    expect(human?.text).toBe("question");
  });

  it("leaves messages untouched for automatically cached models", () => {
    const input = messages();

    expect(withCacheBreakpoint(input, { model: "moonshotai/kimi-k2.6", cache: true })).toBe(input);
  });

  it("leaves messages untouched when the first message is not a system prompt", () => {
    const input = [new HumanMessage("only user")];

    expect(withCacheBreakpoint(input, { model: "anthropic/x", cache: true })).toBe(input);
  });
});

describe("systemMessageFor", () => {
  it("marks the system prompt for explicitly cached providers only", () => {
    expect(systemMessageFor("rules", { model: "anthropic/claude", cache: true }).content).toEqual([
      { type: "text", text: "rules", cache_control: { type: "ephemeral" } },
    ]);
    expect(systemMessageFor("rules", { model: "moonshotai/kimi-k2.6", cache: true }).content).toBe(
      "rules",
    );
  });
});

describe("AgentFailedError", () => {
  it("describes non-Error causes and keeps the spend", () => {
    const error = new AgentFailedError("alpha", [], "timeout");

    expect(error.message).toBe('Agent "alpha" failed: timeout');
    expect(error.usage).toEqual([]);
  });
});
