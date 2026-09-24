import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { describe, expect, it } from "vitest";
import { needsCacheBreakpoint, withCacheBreakpoint } from "../src/llm/cache.js";

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
