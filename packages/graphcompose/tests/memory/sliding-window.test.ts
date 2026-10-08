import { describe, it, expect } from "vitest";
import { HumanMessage } from "@langchain/core/messages";
import { SlidingWindowStrategy } from "../../src/memory/strategies/sliding-window.strategy.js";

describe("SlidingWindowStrategy", () => {
  it("should truncate messages to windowSize", async () => {
    const strategy = new SlidingWindowStrategy();
    const messages = [
      new HumanMessage("1"),
      new HumanMessage("2"),
      new HumanMessage("3"),
      new HumanMessage("4"),
    ];

    const state = { runId: "test-run" };
    
    // Testing windowSize = 2
    const context = await strategy.buildContext(messages, state, { windowSize: 2 });
    
    expect(context).toHaveLength(2);
    expect(context[0]!.content).toBe("3");
    expect(context[1]!.content).toBe("4");
  });

  it("should return all messages if windowSize is greater than messages length", async () => {
    const strategy = new SlidingWindowStrategy();
    const messages = [new HumanMessage("1"), new HumanMessage("2")];
    
    const context = await strategy.buildContext(messages, { runId: "test" }, { windowSize: 10 });
    
    expect(context).toHaveLength(2);
  });
});
