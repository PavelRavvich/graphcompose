import { costLabel, priceOf } from "./cost.js";
import { JevModelProvider } from "./jev.provider.js";
import { OpenRouterModelProvider } from "./openrouter-model.provider.js";
import { promptCachingLabel } from "./prompt-caching.js";
import { reasoningLabel } from "./reasoning.js";
import { ModelProviderDirectory, ModelPurpose } from "./resolve.js";
/** A workflow that registers no providers gets these: OpenRouter for chat, Jev for decisions. */
export const DEFAULT_MODEL_PROVIDERS = [OpenRouterModelProvider, JevModelProvider];
/** The directory of a workflow's model providers (`settings().modelProviders([...])`). */
export const directoryOf = (settings) => ModelProviderDirectory.of(settings?.modelProviders ?? DEFAULT_MODEL_PROVIDERS, settings?.defaultModelProvider);
/** A chat model's settings with the price from its provider's table when it has none of its own. */
function priced(settings, directory) {
    if (settings.price !== undefined)
        return settings;
    const resolution = directory.resolve({
        key: settings.model,
        model: settings.model,
        purpose: ModelPurpose.Chat,
    });
    if (resolution.kind === "problem")
        return settings;
    const price = priceOf(resolution.provider.options.cost, settings.model);
    return price === undefined ? settings : { ...settings, price };
}
/** The config with every chat model priced by its provider's table where it sets no price itself. */
export function withProviderPrices(config, directory) {
    return {
        ...config,
        agents: Object.fromEntries(Object.entries(config.agents).map(([name, agent]) => [name, priced(agent, directory)])),
        ...(config.compaction === undefined
            ? {}
            : {
                compaction: { ...config.compaction, model: priced(config.compaction.model, directory) },
            }),
    };
}
/** One line per model use for the startup log: provider, reasoning and caching, and where they come from. */
export function modelSummaryOf(uses, directory) {
    return uses.flatMap((use) => {
        const resolution = directory.resolve(use);
        if (resolution.kind === "problem")
            return [];
        const provider = resolution.provider.options;
        const inherited = ` (inherited from ${provider.name})`;
        const settings = use.settings;
        const chat = use.purpose === ModelPurpose.Decision || settings === undefined
            ? []
            : [
                `reasoning ${reasoningLabel(settings.reasoning ?? provider.reasoning)}${settings.reasoning === undefined ? inherited : ""}`,
                `caching ${promptCachingLabel(settings.promptCaching ?? provider.promptCaching)}${settings.promptCaching === undefined ? inherited : ""}`,
            ];
        return [
            [
                `${use.key}  ${use.model}`,
                `provider ${provider.name}`,
                ...chat,
                costLabel(provider.cost),
            ].join(" · "),
        ];
    });
}
