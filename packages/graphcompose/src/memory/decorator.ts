import { Injectable } from "../components/decorators.js";

/** Registers a memory strategy in the DI container and attaches its configuration. */
export function MemoryStrategy<T>(options: T): ClassDecorator {
  return (target: any) => {
    Injectable()(target);
    Reflect.defineMetadata("graphcompose:memory:options", options, target);
  };
}

/** Utility to read the options attached to a memory strategy class. */
export function getMemoryOptions<T>(target: any): T | undefined {
  return Reflect.getMetadata("graphcompose:memory:options", target) as T | undefined;
}
