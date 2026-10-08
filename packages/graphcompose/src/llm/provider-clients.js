import { connectionOf } from "../models/connections.js";
import { ConfigurationError } from "../models/problems.js";
import { ModelPurpose, } from "../models/resolve.js";
export class ProviderCapabilityError extends Error {
    name = "ProviderCapabilityError";
}
/**
 * The raw clients of the default gateway over model providers: the provider serving each model
 * makes its chat model or answers its decision. Every provider's key is read here, at startup.
 */
export function providerClients(directory, options) {
    const connections = new Map(directory.providers.map((provider) => [
        provider.options.name,
        connectionOf(provider.options, { ...options, requireKeys: true }),
    ]));
    const providerFor = (model, purpose) => {
        const resolution = directory.resolve({ key: model, model, purpose });
        if (resolution.kind === "problem")
            throw new ConfigurationError([resolution.problem]);
        const provider = resolution.provider;
        const connection = connections.get(provider.options.name) ??
            connectionOf(provider.options, { ...options, requireKeys: true });
        return { provider, connection };
    };
    const chatModel = (settings) => {
        const { provider, connection } = providerFor(settings.model, ModelPurpose.Chat);
        const chat = provider.handler.chat?.bind(provider.handler);
        if (chat === undefined)
            throw new ProviderCapabilityError(`${provider.options.name} has no chat models`);
        return chat({
            settings,
            reasoning: settings.reasoning ?? provider.options.reasoning,
            promptCaching: settings.promptCaching ?? provider.options.promptCaching,
            connection,
        });
    };
    const jevClient = (decision) => {
        const { provider, connection } = providerFor(decision.model, ModelPurpose.Decision);
        const routeTo = provider.handler.routeTo?.bind(provider.handler);
        if (routeTo === undefined)
            throw new ProviderCapabilityError(`${provider.options.name} does not routeTo`);
        return routeTo({ decision, connection });
    };
    return { chatModel, jevClient };
}
