import type { BaseMessage } from "@langchain/core/messages";
import { MemoryStrategy } from "../decorator.js";
import { BaseMemoryOptions, BaseMemoryStrategy, MemoryState } from "../types.js";

@MemoryStrategy<BaseMemoryOptions>({ windowSize: 10 })
export class SlidingWindowStrategy extends BaseMemoryStrategy<BaseMemoryOptions> {
  async buildContext(
    messages: BaseMessage[],
    _state: MemoryState,
    options: BaseMemoryOptions,
  ): Promise<BaseMessage[]> {
    return messages.slice(-options.windowSize);
  }

  async updateMemory(): Promise<void> {
    // Zero-cost strategy, no persistent updates needed
  }
}
