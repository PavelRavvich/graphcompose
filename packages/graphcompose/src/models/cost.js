export const ModelCost = {
    /** The provider reports each call's cost in its answer (OpenRouter `usage.cost`). */
    fromResponse() {
        return Object.freeze({ kind: "from-response" });
    },
    /** Tokens × the price of the model (a local server, a provider that reports no cost). */
    fromPrices(prices) {
        return Object.freeze({ kind: "from-prices", prices: Object.freeze({ ...prices }) });
    },
};
/** The price table entry of a model as the accounting reads it; none for `fromResponse`. */
export function priceOf(cost, model) {
    if (cost.kind === "from-response")
        return undefined;
    const price = cost.prices[model];
    if (price === undefined)
        return undefined;
    return {
        inputPerMTok: price.inputPerMillion,
        outputPerMTok: price.outputPerMillion,
        ...(price.cachedInputPerMillion === undefined
            ? {}
            : { cacheReadPerMTok: price.cachedInputPerMillion }),
    };
}
/** How a cost source reads in the startup log. */
export const costLabel = (cost) => cost.kind === "from-response" ? "cost from the response" : "cost from the price table";
