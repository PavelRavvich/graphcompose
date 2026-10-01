/**
 * Lifecycle hooks of components the container creates (services, tools, knowledge bases): `onStart`
 * runs when the app is built, `onStop` when it is closed. Values and test mocks have no hooks.
 */
export interface OnStart {
  onStart(): Promise<void> | void;
}

export interface OnStop {
  onStop(): Promise<void> | void;
}

const hasHook = <THook extends "onStart" | "onStop">(
  instance: unknown,
  hook: THook,
): instance is Record<THook, () => Promise<void> | void> =>
  typeof instance === "object" &&
  instance !== null &&
  typeof Reflect.get(instance, hook) === "function";

/** `onStart` of every instance that has it, in creation order (dependencies first). */
export async function startAll(instances: readonly unknown[]): Promise<void> {
  for (const instance of instances) {
    if (hasHook(instance, "onStart")) await instance.onStart();
  }
}

/** `onStop` of every instance that has it, dependants first; every hook runs even when one fails. */
export async function stopAll(instances: readonly unknown[]): Promise<void> {
  const failures: unknown[] = [];
  for (const instance of [...instances].reverse()) {
    if (!hasHook(instance, "onStop")) continue;
    try {
      await instance.onStop();
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length > 0) throw new AggregateError(failures, "onStop failed");
}
