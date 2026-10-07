import { ChatOpenAI } from "@langchain/openai";
import { MODEL_MAX } from "../config/types.js";
import { ModelListCache } from "./model-list.js";
import { CacheRetention } from "./prompt-caching.js";
import { wireFetch } from "./wire.js";
export const EPHEMERAL = { type: "ephemeral" };
/**
 * Any OpenAI-compatible server. `TFields` types the provider's own request fields: a subclass sets
 * `override readonly requestFields: TFields = { … }` and a typo there is a compile error. Reasoning
 * and caching are sent in OpenAI's form (`reasoning_effort`, `prompt_cache_key`,
 * `prompt_cache_retention`); a subclass with another dialect overrides `reasoningFields` / `cachingPlan`.
 */
export class OpenAiCompatibleProvider {
    models = new ModelListCache();
    chat(request) {
        const { settings, connection } = request;
        return new ChatOpenAI({
            apiKey: connection.apiKey ?? "none",
            model: settings.model,
            temperature: settings.temperature,
            ...(settings.maxTokens === MODEL_MAX ? {} : { maxTokens: settings.maxTokens }),
            // the provider's client owns timeouts and retries (its retry policy and circuit breaker)
            maxRetries: 0,
            configuration: {
                baseURL: connection.baseUrl,
                fetch: wireFetch(this.wirePlanOf(request), connection.fetch),
                defaultHeaders: { "X-Title": "GraphCompose" },
            },
        });
    }
    /** Everything this provider adds to a request of `request`'s model. */
    wirePlanOf(request) {
        const caching = this.cachingPlan({
            caching: request.promptCaching,
            model: request.settings.model,
        });
        return {
            ...caching,
            fields: {
                ...this.wireFieldsOf(this.requestFields),
                ...this.reasoningFields(request.reasoning),
                ...caching.fields,
            },
        };
    }
    /** The provider's request fields as they go on the wire; a subclass may rename or reshape them. */
    wireFieldsOf(fields) {
        return Object.fromEntries(Object.entries(fields));
    }
    /** OpenAI's `reasoning_effort`; a budget is not part of OpenAI's API (the startup check says so). */
    reasoningFields(reasoning) {
        if (reasoning.kind === "off")
            return { reasoning_effort: "none" };
        if (reasoning.kind === "on" && reasoning.effort !== undefined) {
            return { reasoning_effort: reasoning.effort };
        }
        return {};
    }
    /** OpenAI caches automatically: a key routes requests to one cache, `24h` keeps it a day. */
    cachingPlan({ caching }) {
        if (caching.kind === "off")
            return { fields: {}, cacheMarkers: [], cacheControl: EPHEMERAL };
        return {
            fields: {
                ...(caching.key === undefined ? {} : { prompt_cache_key: caching.key }),
                ...(caching.retention === CacheRetention.OneDay ? { prompt_cache_retention: "24h" } : {}),
            },
            cacheMarkers: [],
            cacheControl: EPHEMERAL,
        };
    }
    async capabilities(model, connection) {
        const entry = await this.models.entryOf(model, connection);
        return entry === undefined ? undefined : this.capabilitiesOf(entry);
    }
    /** A plain `/models` entry declares nothing beyond the model's existence. */
    capabilitiesOf(entry) {
        return { model: entry.id };
    }
}
