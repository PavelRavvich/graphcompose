import type { BaseMessage } from "@langchain/core/messages";
import { SystemMessage } from "@langchain/core/messages";
import { ModelGateway } from "../../llm/gateway.js";
import { MemoryStrategy } from "../decorator.js";
import { BaseMemoryStorage, BaseMemoryOptions, BaseMemoryStrategy, MemoryState } from "../types.js";

export interface CompactionOptions extends BaseMemoryOptions {
  compactEvery: number;
  summariesToKeep: number;
  llmModel: string;
}

@MemoryStrategy<CompactionOptions>({
  windowSize: 10,
  compactEvery: 5,
  summariesToKeep: 3,
  llmModel: "openrouter:anthropic/claude-3-haiku",
})
export class StandardCompactionStrategy extends BaseMemoryStrategy<CompactionOptions> {
  constructor(
    private readonly storage: BaseMemoryStorage,
    private readonly gateway: ModelGateway,
  ) {
    super();
  }

  async buildContext(
    messages: BaseMessage[],
    state: MemoryState,
    options: CompactionOptions,
  ): Promise<BaseMessage[]> {
    const summaries = await this.storage.load<string[]>(state.runId, "compaction") ?? [];
    const rawWindow = messages.slice(-options.windowSize);

    if (summaries.length === 0) {
      return rawWindow;
    }

    const systemMsg = new SystemMessage(`Previously in conversation:\n${summaries.join("\n")}`);
    return [systemMsg, ...rawWindow];
  }

  async updateMemory(
    messages: BaseMessage[],
    state: MemoryState,
    options: CompactionOptions,
  ): Promise<void> {
    const overflow = messages.length - options.windowSize;
    if (overflow < options.compactEvery) {
      return;
    }

    const toCompact = messages.slice(0, options.compactEvery);
    
    // Create a chat model instance via the gateway
    const model = this.gateway.chatModel({
      purpose: "compaction",
      model: options.llmModel,
    });

    const response = await model.invoke([
      new SystemMessage("Summarize the following conversation segment concisely. Retain all factual information."),
      ...toCompact,
    ]);

    const summaries = await this.storage.load<string[]>(state.runId, "compaction") ?? [];
    summaries.push(String(response.content));

    if (summaries.length > options.summariesToKeep) {
      summaries.shift();
    }

    await this.storage.save<string[]>(state.runId, "compaction", summaries);
  }
}
