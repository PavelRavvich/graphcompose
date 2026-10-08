import { describe, it, expect, vi } from "vitest";
import { HumanMessage } from "@langchain/core/messages";
import { StandardCompactionStrategy, CompactionOptions } from "../../src/memory/strategies/compaction.strategy.js";
import { InMemoryStorage } from "../../src/memory/storage/in-memory-storage.js";
import { ModelGateway } from "../../src/llm/gateway.js";

describe("StandardCompactionStrategy", () => {
  const options: CompactionOptions = {
    windowSize: 2,
    compactEvery: 2,
    summariesToKeep: 2,
    llmModel: "test-model",
  };

  it("should build context with no previous summaries", async () => {
    const storage = new InMemoryStorage();
    const strategy = new StandardCompactionStrategy(storage, {} as ModelGateway);
    
    const messages = [
      new HumanMessage("1"),
      new HumanMessage("2"),
      new HumanMessage("3"),
    ];

    const context = await strategy.buildContext(messages, { runId: "run-1" }, options);
    
    // Window size is 2, no summaries yet
    expect(context).toHaveLength(2);
    expect(context[0]!.content).toBe("2");
    expect(context[1]!.content).toBe("3");
  });

  it("should trigger compaction when overflow reaches compactEvery", async () => {
    const storage = new InMemoryStorage();
    
    // Mock gateway
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: "Summary of 1 and 2" })
    };
    const gateway = {
      chatModel: vi.fn().mockReturnValue(mockModel)
    } as unknown as ModelGateway;

    const strategy = new StandardCompactionStrategy(storage, gateway);
    
    const messages = [
      new HumanMessage("1"),
      new HumanMessage("2"),
      new HumanMessage("3"),
      new HumanMessage("4"),
    ];

    // windowSize: 2, overflow is 2. compactEvery is 2. Should compact!
    await strategy.updateMemory(messages, { runId: "run-1" }, options);

    expect(gateway.chatModel).toHaveBeenCalledWith({ purpose: "compaction", model: "test-model" });
    expect(mockModel.invoke).toHaveBeenCalled();

    // Now check if it was saved
    const summaries = await storage.load<string[]>("run-1", "compaction");
    expect(summaries).toEqual(["Summary of 1 and 2"]);
  });
});
