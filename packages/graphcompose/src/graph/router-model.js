import { createRouter } from "../routers/index.js";
import { isJevModel } from "../models/uses.js";
export { isJevModel };
/** A router's model by its id: Jev, or a chat model with the settings the registry knows. */
export function routerModelOf(model, deps) {
    return isJevModel(model)
        ? { kind: "jev", model }
        : { ...deps.chatModelSettings(model), kind: "llm", model };
}
/** `FlowRuntime.routerFor` through the existing routers (one route → no call). */
export function flowRouterFactory(deps) {
    return (router) => createRouter(router.name, routerModelOf(router.model, deps), deps.chatDefaults, deps.gateway);
}
/**
 * A router on a chat model: priced like the agent (or compaction) that uses the same model when one
 * has a price; otherwise its provider reports the cost (or prices it from its table).
 */
export function chatModelSettingsOf(config) {
    const known = [
        ...Object.values(config.agents),
        ...(config.compaction === undefined ? [] : [config.compaction.model]),
    ];
    return (model) => {
        const price = known.find((candidate) => candidate.model === model)?.price;
        return price === undefined ? { model } : { model, price };
    };
}
