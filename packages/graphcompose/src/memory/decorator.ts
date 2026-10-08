import { Injectable } from "../components/decorators.js";

const memoryOptionsMap = new WeakMap<object, unknown>();

/** Registers a memory strategy in the DI container and attaches its configuration. */
export function MemoryStrategy<T>(options: T): ClassDecorator {
  return (target: any) => {
    Injectable()(target);
    memoryOptionsMap.set(target, options);
  };
}

/** Utility to read the options attached to a memory strategy class. */
export function getMemoryOptions<T>(target: any): T | undefined {
  return memoryOptionsMap.get(target) as T | undefined;
}
