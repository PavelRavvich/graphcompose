import { EPHEMERAL, OpenAiCompatibleProvider, } from "./openai-compatible.provider.js";
import { CachedPart, CacheRetention } from "./prompt-caching.js";
import { ReasoningEffort } from "./reasoning.js";
/** Models whose caching needs explicit `cache_control` markers; the rest cache automatically. */
const EXPLICIT_CACHE_MODELS = ["anthropic/", "google/"];
const ALL_EFFORTS = Object.values(ReasoningEffort);
const isEffort = (value) => ALL_EFFORTS.includes(value);
function reasoningSupportOf(entry) {
    if (entry.supported_parameters === undefined)
        return undefined;
    const supported = entry.supported_parameters.includes("reasoning");
    return {
        supported,
        efforts: supported ? (entry.reasoning?.supported_efforts?.filter(isEffort) ?? ALL_EFFORTS) : [],
        budget: supported,
        // OpenRouter takes an effort or a budget (max_tokens), never both
        effortWithBudget: false,
        canTurnOff: entry.reasoning?.mandatory !== true,
    };
}
function cachingSupportOf(entry) {
    if (entry.pricing === undefined)
        return undefined;
    const supported = "input_cache_read" in entry.pricing;
    return {
        supported,
        retentions: [
            CacheRetention.FiveMinutes,
            ...("input_cache_write_1h" in entry.pricing ? [CacheRetention.OneHour] : []),
        ],
        cachedParts: Object.values(CachedPart),
    };
}
/**
 * OpenRouter: OpenAI-compatible with its own dialect — `reasoning: { effort | max_tokens }`, the
 * call's cost in `usage.cost`, `cache_control` markers for Anthropic and Google models, and a model
 * list that says what each model supports.
 */
export class OpenRouterProvider extends OpenAiCompatibleProvider {
    reasoningFields(reasoning) {
        switch (reasoning.kind) {
            case "model-decides":
                return {};
            case "off":
                return { reasoning: { effort: "none", exclude: true } };
            case "on":
                return {
                    reasoning: {
                        ...(reasoning.effort === undefined ? {} : { effort: reasoning.effort }),
                        ...(reasoning.budget === undefined ? {} : { max_tokens: reasoning.budget.tokens }),
                        // thoughts are billed but not returned
                        exclude: true,
                    },
                };
        }
    }
    cachingPlan({ caching, model }) {
        const usage = { usage: { include: true } };
        const explicit = EXPLICIT_CACHE_MODELS.some((prefix) => model.startsWith(prefix));
        if (caching.kind === "off" || !explicit) {
            return { fields: usage, cacheMarkers: [], cacheControl: EPHEMERAL };
        }
        return {
            fields: usage,
            cacheMarkers: caching.cachedParts,
            cacheControl: caching.retention === CacheRetention.FiveMinutes
                ? EPHEMERAL
                : { ...EPHEMERAL, ttl: caching.retention },
        };
    }
    capabilitiesOf(entry) {
        const reasoning = reasoningSupportOf(entry);
        const promptCaching = cachingSupportOf(entry);
        return {
            model: entry.id,
            ...(entry.supported_parameters === undefined
                ? {}
                : { parameters: entry.supported_parameters }),
            ...(reasoning === undefined ? {} : { reasoning }),
            ...(promptCaching === undefined ? {} : { promptCaching }),
        };
    }
}
