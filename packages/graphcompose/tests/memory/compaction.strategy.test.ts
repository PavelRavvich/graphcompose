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


  it("should throw MemoryStorageError if load fails during buildContext", async () => {
    const storage = new InMemoryStorage();
    vi.spyOn(storage, "load").mockRejectedValue(new Error("DB Down"));
    const strategy = new StandardCompactionStrategy(storage, {} as ModelGateway);
    
    await expect(strategy.buildContext([], { runId: "r-1" }, options))
      .rejects.toThrow("Failed to load compaction summaries for run r-1");
  });

  it("should throw MemoryCompactionError if LLM invocation fails", async () => {
    const storage = new InMemoryStorage();
    const mockModel = {
      invoke: vi.fn().mockRejectedValue(new Error("API limit"))
    };
    const gateway = {
      chatModel: vi.fn().mockReturnValue(mockModel)
    } as unknown as ModelGateway;

    const strategy = new StandardCompactionStrategy(storage, gateway);
    
    const messages = [new HumanMessage("1"), new HumanMessage("2"), new HumanMessage("3"), new HumanMessage("4")];
    await expect(strategy.updateMemory(messages, { runId: "r-1" }, options))
      .rejects.toThrow("LLM compaction failed for run r-1");
  });

  it("should throw MemoryCompactionError if LLM returns empty summary", async () => {
    const storage = new InMemoryStorage();
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: "   " })
    };
    const gateway = {
      chatModel: vi.fn().mockReturnValue(mockModel)
    } as unknown as ModelGateway;

    const strategy = new StandardCompactionStrategy(storage, gateway);
    
    const messages = [new HumanMessage("1"), new HumanMessage("2"), new HumanMessage("3"), new HumanMessage("4")];
    await expect(strategy.updateMemory(messages, { runId: "r-1" }, options))
      .rejects.toThrow("LLM compaction returned empty summary for run r-1");
  });

  it("should shift old summaries when exceeding summariesToKeep", async () => {
    const storage = new InMemoryStorage();
    // Pre-fill storage with 2 summaries (which is summariesToKeep)
    await storage.save("run-1", "compaction", ["old 1", "old 2"]);

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: "new summary" })
    };
    const gateway = {
      chatModel: vi.fn().mockReturnValue(mockModel)
    } as unknown as ModelGateway;

    const strategy = new StandardCompactionStrategy(storage, gateway);
    
    const messages = [new HumanMessage("1"), new HumanMessage("2"), new HumanMessage("3"), new HumanMessage("4")];
    await strategy.updateMemory(messages, { runId: "run-1" }, options);

    const resulting = await storage.load<string[]>("run-1", "compaction");
    expect(resulting).toEqual(["old 2", "new summary"]); // "old 1" was shifted out!
  });

  it("should throw MemoryStorageError if save fails", async () => {
    const storage = new InMemoryStorage();
    vi.spyOn(storage, "save").mockRejectedValue(new Error("Write error"));

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: "new" })
    };
    const gateway = {
      chatModel: vi.fn().mockReturnValue(mockModel)
    } as unknown as ModelGateway;

    const strategy = new StandardCompactionStrategy(storage, gateway);
    
    const messages = [new HumanMessage("1"), new HumanMessage("2"), new HumanMessage("3"), new HumanMessage("4")];
    await expect(strategy.updateMemory(messages, { runId: "r-1" }, options))
      .rejects.toThrow("Failed to save compaction summaries for run r-1");
  });
});
