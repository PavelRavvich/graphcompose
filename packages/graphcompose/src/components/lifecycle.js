const hasHook = (instance, hook) => typeof instance === "object" &&
    instance !== null &&
    typeof Reflect.get(instance, hook) === "function";
/** `onInit` of every instance that has it, in creation order. */
export async function initAll(instances) {
    for (const instance of instances) {
        if (hasHook(instance, "onInit"))
            await instance.onInit();
    }
}
/** `afterAssemble` of every instance that has it, in creation order. */
export async function assembleAll(instances) {
    for (const instance of instances) {
        if (hasHook(instance, "afterAssemble"))
            await instance.afterAssemble();
    }
}
/** `onStart` of every instance that has it, in creation order (dependencies first). */
export async function startAll(instances) {
    for (const instance of instances) {
        if (hasHook(instance, "onStart"))
            await instance.onStart();
    }
}
/** `onStop` of every instance that has it, dependants first; every hook runs even when one fails. */
export async function stopAll(instances) {
    const failures = [];
    for (const instance of [...instances].reverse()) {
        if (!hasHook(instance, "onStop"))
            continue;
        try {
            await instance.onStop();
        }
        catch (error) {
            failures.push(error);
        }
    }
    if (failures.length > 0)
        throw new AggregateError(failures, "onStop failed");
}
