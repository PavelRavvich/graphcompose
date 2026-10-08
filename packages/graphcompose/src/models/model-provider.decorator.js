const providers = new WeakMap();
export class ModelProviderError extends Error {
    name = "ModelProviderError";
}
/** A model provider: `@ModelProvider({ … }) class X extends OpenAiCompatibleProvider<Fields>`. */
export function ModelProvider(options) {
    if (options.serves.length === 0) {
        throw new ModelProviderError(`@ModelProvider "${options.name}": serves needs at least one pattern`);
    }
    return (value) => {
        providers.set(value, Object.freeze({ ...options }));
        return value;
    };
}
/** The options of a `@ModelProvider` class. */
export function modelProviderOf(cls) {
    const options = providers.get(cls);
    if (options === undefined) {
        const name = typeof cls === "function" ? cls.name : "a value";
        throw new ModelProviderError(`${name} is not a @ModelProvider class`);
    }
    return options;
}
/** Whether a provider serves a model by name. */
export const servesModel = (options, model) => options.serves.some((pattern) => new RegExp(pattern.source, pattern.flags.replace("g", "")).test(model));
