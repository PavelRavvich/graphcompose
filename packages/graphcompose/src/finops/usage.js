/** What a call was for — the cost categories of a turn. */
export const COST_CATEGORIES = [
    "agents",
    "routing",
    "guards",
    "review",
    "tools",
    "compaction",
    "retrieval",
];
/** Category from the caller name: tool:*, router:guard:*, router:quality:*, other router:*, agent. */
export function costCategoryOf(caller) {
    if (caller.startsWith("tool:"))
        return "tools";
    if (caller === "compaction")
        return "compaction";
    if (caller.startsWith("rag:"))
        return "retrieval";
    if (caller.startsWith("router:guard:"))
        return "guards";
    if (caller.startsWith("router:quality:"))
        return "review";
    if (caller.startsWith("router:"))
        return "routing";
    return "agents";
}
export const ZERO_USAGE = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
};
const NO_METADATA = { input_tokens: 0, output_tokens: 0 };
export function extractTokenUsage(message) {
    const usage = message.usage_metadata ?? NO_METADATA;
    const details = usage.input_token_details ?? {};
    return {
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        cacheReadTokens: details.cache_read ?? 0,
        cacheWriteTokens: details.cache_creation ?? 0,
    };
}
export function costOf(usage, price) {
    const uncached = Math.max(0, usage.inputTokens - usage.cacheReadTokens - usage.cacheWriteTokens);
    const readPrice = price.cacheReadPerMTok ?? price.inputPerMTok;
    const writePrice = price.cacheWritePerMTok ?? price.inputPerMTok;
    const micro = uncached * price.inputPerMTok +
        usage.cacheReadTokens * readPrice +
        usage.cacheWriteTokens * writePrice +
        usage.outputTokens * price.outputPerMTok;
    return micro / 1_000_000;
}
export class ModelCostError extends Error {
    name = "ModelCostError";
}
/** The cost the provider reported in its replyWith (`usage.cost`), when it did. */
export function reportedCostOf(message) {
    const usage = message.response_metadata?.usage;
    const cost = typeof usage === "object" && usage !== null && "cost" in usage ? usage.cost : undefined;
    return typeof cost === "number" && Number.isFinite(cost) && cost >= 0 ? cost : undefined;
}
/**
 * One model call's record: the provider's reported cost first (`api`), else tokens × the model's
 * price (`price-table`). A call that has neither cannot be accounted and fails.
 */
export function recordUsage(caller, settings, message) {
    const usage = extractTokenUsage(message);
    const reported = reportedCostOf(message);
    if (reported !== undefined) {
        return { caller, model: settings.model, ...usage, costUsd: reported, costSource: "api" };
    }
    if (settings.price === undefined) {
        throw new ModelCostError(`${caller}: model ${settings.model} — its provider reported no cost and it has no price`);
    }
    return {
        caller,
        model: settings.model,
        ...usage,
        costUsd: costOf(usage, settings.price),
        costSource: "price-table",
    };
}
export class InvalidToolCostError extends Error {
    name = "InvalidToolCostError";
}
/** A paid tool's own cost, recorded like a model call: caller `tool:<name>`. */
/** A cost a tool reported, billed to its `costCaller` when it has one (e.g. `rag:<name>`). */
export const recordReportedCost = (tool, costUsd) => tool.costCaller === undefined
    ? recordToolCost(tool.name, costUsd)
    : { ...recordToolCost(tool.name, costUsd), caller: tool.costCaller };
export function recordToolCost(tool, costUsd) {
    if (!Number.isFinite(costUsd) || costUsd < 0) {
        throw new InvalidToolCostError(`Tool "${tool}" reported an invalid cost: ${String(costUsd)}`);
    }
    return { caller: `tool:${tool}`, model: tool, ...ZERO_USAGE, costUsd, costSource: "tool" };
}
export function totalCost(records) {
    return records.reduce((sum, record) => sum + record.costUsd, 0);
}
function sumBy(lines, key) {
    const sums = {};
    for (const line of lines)
        sums[key(line)] = (sums[key(line)] ?? 0) + line.costUsd;
    return sums;
}
export function buildCostReport(records) {
    const trace = records.map((record) => ({
        ...record,
        category: costCategoryOf(record.caller),
    }));
    const byCategory = {
        agents: 0,
        routing: 0,
        guards: 0,
        review: 0,
        tools: 0,
        compaction: 0,
        retrieval: 0,
    };
    for (const line of trace)
        byCategory[line.category] += line.costUsd;
    return {
        totalUsd: totalCost(records),
        calls: records.length,
        cacheReadTokens: records.reduce((sum, record) => sum + record.cacheReadTokens, 0),
        byCaller: sumBy(trace, (line) => line.caller),
        byCategory,
        byModel: sumBy(trace, (line) => line.model),
        trace,
    };
}
