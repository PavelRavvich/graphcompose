import { Injectable } from "../components/decorators.js";

const memoryOptionsMap = new WeakMap<object, unknown>();

/** Registers a memory strategy in the DI container and attaches its configuration. */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function MemoryStrategy<T>(options: T): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (target: any) => {
    Injectable()(target);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    memoryOptionsMap.set(target, options);
  };
}

/** Utility to read the options attached to a memory strategy class. */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function getMemoryOptions<T>(target: any): T | undefined {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return memoryOptionsMap.get(target) as T | undefined;
}
