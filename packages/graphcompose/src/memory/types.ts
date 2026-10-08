import type { BaseMessage } from "@langchain/core/messages";

export interface BaseMemoryOptions {
  windowSize: number;
}

export interface MemoryState {
  runId: string;
  [key: string]: unknown;
}

export abstract class BaseMemoryStorage {
  abstract load<V>(runId: string, namespace: string): Promise<V | undefined>;
  abstract save<V>(runId: string, namespace: string, data: V): Promise<void>;
}

export abstract class BaseMemoryStrategy<T extends BaseMemoryOptions = BaseMemoryOptions> {
  abstract buildContext(
    messages: BaseMessage[],
    state: MemoryState,
    options: T,
  ): Promise<BaseMessage[]>;

  abstract updateMemory(messages: BaseMessage[], state: MemoryState, options: T): Promise<void>;
}
