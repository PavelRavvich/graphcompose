import type { Class } from "../components/injection.js";

export interface BatchStrategyOptions {
  name?: string;
}

export interface BatchStrategyMeta extends BatchStrategyOptions {
  name: string;
}

const batchStrategies = new WeakMap<Class, BatchStrategyMeta>();

export function BatchStrategy(options?: BatchStrategyOptions) {
  return function (target: Class) {
    batchStrategies.set(target, { name: options?.name ?? target.name, ...options });
  };
}

export const batchStrategyMetaOf = (target: Class): BatchStrategyMeta | undefined =>
  batchStrategies.get(target);

export interface BatchParallelStrategy<TState, TItem> {
  extract(state: TState): TItem[];
}
