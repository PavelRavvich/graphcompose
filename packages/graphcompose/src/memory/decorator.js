import { Injectable } from "../components/decorators.js";
const memoryOptionsMap = new WeakMap();
/** Registers a memory strategy in the DI container and attaches its configuration. */
export function MemoryStrategy(options) {
    return (target) => {
        Injectable()(target);
        memoryOptionsMap.set(target, options);
    };
}
/** Utility to read the options attached to a memory strategy class. */
export function getMemoryOptions(target) {
    return memoryOptionsMap.get(target);
}
