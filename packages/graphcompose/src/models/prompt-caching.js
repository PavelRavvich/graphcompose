/** How long a cached prompt prefix lives. */
export var CacheRetention;
(function (CacheRetention) {
    CacheRetention["FiveMinutes"] = "5m";
    CacheRetention["OneHour"] = "1h";
    CacheRetention["OneDay"] = "24h";
})(CacheRetention || (CacheRetention = {}));
/** The parts of a request that are cached: the stable prefix and the history before the new turn. */
export var CachedPart;
(function (CachedPart) {
    CachedPart["SystemPrompt"] = "system-prompt";
    CachedPart["Tools"] = "tools";
    CachedPart["History"] = "history";
})(CachedPart || (CachedPart = {}));
export class PromptCachingError extends RangeError {
    name = "PromptCachingError";
}
export const PromptCaching = {
    whereSupported(options) {
        if (options.cachedParts.length === 0) {
            throw new PromptCachingError("cachedParts needs at least one part (or use PromptCaching.off())");
        }
        return Object.freeze({ kind: "where-supported", ...options });
    },
    off() {
        return Object.freeze({ kind: "off" });
    },
};
/** Today's component `cache` (until #152): true = the provider's (unset), false = off. */
export function promptCachingOfSetting(cache) {
    if (cache === undefined || cache === true)
        return undefined;
    return cache === false ? PromptCaching.off() : cache;
}
export function promptCachingLabel(caching) {
    return caching.kind === "off"
        ? "off"
        : `where supported (${caching.retention}; ${caching.cachedParts.join(", ")})`;
}
