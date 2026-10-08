import { createJevRouter, createLlmRouter, } from "../routers/index.js";
import { providerClients } from "./provider-clients.js";
/** Settings that make a different client; identical ones share one. */
const clientKey = (settings) => JSON.stringify([
    settings.model,
    settings.temperature,
    settings.maxTokens,
    settings.reasoning,
    settings.promptCaching,
]);
/** The default gateway over raw clients: one chat client per settings, Jev or LLM decisions. */
export function createModelGateway(clients) {
    const cache = new Map();
    const chatModel = ({ settings }) => {
        const key = clientKey(settings);
        const model = cache.get(key) ?? clients.chatModel(settings);
        cache.set(key, model);
        return model;
    };
    const strategyOf = ({ router, model }) => model.kind === "jev"
        ? createJevRouter({ name: router, model: model.model, client: clients.jevClient })
        : createLlmRouter({
            name: router,
            model: chatModel({ user: { kind: "router", router }, settings: model.settings }),
            settings: model.settings,
        });
    return { chatModel, routeTo: (spec) => strategyOf(spec).route(spec.request) };
}
/**
 * Production: every model from the workflow's model providers (`settings().modelProviders([...])`) —
 * chat models and Jev decisions, each through its provider's connection; keys from `env`.
 */
export function createProviderGateway(directory, options) {
    return createModelGateway(providerClients(directory, options));
}
