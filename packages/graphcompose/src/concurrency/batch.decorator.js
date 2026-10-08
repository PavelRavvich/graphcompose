const batchParallelStrategies = new WeakMap();
export function BatchParallelStrategy(options) {
    return function (target) {
        batchParallelStrategies.set(target, { name: options?.name ?? target.name, ...options });
    };
}
export const batchParallelStrategyMetaOf = (target) => batchParallelStrategies.get(target);
