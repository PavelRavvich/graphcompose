import type { BaseMessage } from "@langchain/core/messages";
import { SystemMessage } from "@langchain/core/messages";
import { ModelGateway } from "../../llm/gateway.js";
import { MemoryStrategy } from "../decorator.js";
import { BaseMemoryStorage, BaseMemoryOptions, BaseMemoryStrategy, MemoryState } from "../types.js";
import { MemoryStorageError, MemoryCompactionError } from "../errors.js";

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
    let summaries: string[];
    try {
      summaries = (await this.storage.load<string[]>(state.runId, "compaction")) ?? [];
    } catch (e) {
      throw new MemoryStorageError(`Failed to load compaction summaries for run ${state.runId}`, e);
    }

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

    let response;
    try {
      const model = this.gateway.chatModel({
        user: { kind: "compaction" },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        settings: { model: options.llmModel } as any,
      });

      response = await model.invoke([
        new SystemMessage(
          "Summarize the following conversation segment concisely. Retain all factual information.",
        ),
        ...toCompact,
      ]);
    } catch (e) {
      throw new MemoryCompactionError(`LLM compaction failed for run ${state.runId}`, e);
    }

    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const text = String(response.content).trim();
    if (!text) {
      throw new MemoryCompactionError(
        `LLM compaction returned empty summary for run ${state.runId}`,
      );
    }

    let summaries: string[];
    try {
      summaries = (await this.storage.load<string[]>(state.runId, "compaction")) ?? [];
      summaries.push(text);

      if (summaries.length > options.summariesToKeep) {
        summaries.shift();
      }

      await this.storage.save<string[]>(state.runId, "compaction", summaries);
    } catch (e) {
      throw new MemoryStorageError(`Failed to save compaction summaries for run ${state.runId}`, e);
    }
  }
}
