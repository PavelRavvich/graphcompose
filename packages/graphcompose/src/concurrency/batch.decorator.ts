import type { Class } from "../components/injection.js";

export interface MapEachStrategyOptions {
  name?: string;
}

export interface MapEachStrategyMeta extends MapEachStrategyOptions {
  name: string;
}

const mapEachStrategies = new WeakMap<Class, MapEachStrategyMeta>();

export function MapEachStrategy(options?: MapEachStrategyOptions) {
  return function (target: Class) {
    mapEachStrategies.set(target, { name: options?.name ?? target.name, ...options });
  };
}

export const mapEachStrategyMetaOf = (target: Class): MapEachStrategyMeta | undefined =>
  mapEachStrategies.get(target);

export interface MapEachStrategy<TState, TItem> {
  extract(state: TState): TItem[];
}
