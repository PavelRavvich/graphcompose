import type { Price, ResolvedModelSettings } from "../config/types.js";

/** Anything a chat model returns that may carry token usage (AIMessage, AIMessageChunk). */
export interface UsageCarrier {
  readonly usage_metadata?: {
    readonly input_tokens: number;
    readonly output_tokens: number;
    readonly input_token_details?: {
      readonly cache_read?: number;
      readonly cache_creation?: number;
    };
  };
}

/** inputTokens includes cached tokens (OpenAI-compatible accounting). */
export interface TokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
}

/**
 * "api" = cost reported by the provider (exact); "price-table" = tokens × configured price;
 * "tool" = cost reported by a paid tool itself.
 */
export type CostSource = "api" | "price-table" | "tool";

/** One model call: who made it, on which model, what it cost. */
export interface UsageRecord extends TokenUsage {
  readonly caller: string;
  readonly model: string;
  readonly costUsd: number;
  readonly costSource: CostSource;
}

export interface CostReport {
  readonly totalUsd: number;
  readonly calls: number;
  readonly cacheReadTokens: number;
  readonly byCaller: Readonly<Record<string, number>>;
}

export const ZERO_USAGE: TokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

type UsageMetadata = NonNullable<UsageCarrier["usage_metadata"]>;

const NO_METADATA: UsageMetadata = { input_tokens: 0, output_tokens: 0 };

export function extractTokenUsage(message: UsageCarrier): TokenUsage {
  const usage = message.usage_metadata ?? NO_METADATA;
  const details = usage.input_token_details ?? {};
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadTokens: details.cache_read ?? 0,
    cacheWriteTokens: details.cache_creation ?? 0,
  };
}

export function costOf(usage: TokenUsage, price: Price): number {
  const uncached = Math.max(0, usage.inputTokens - usage.cacheReadTokens - usage.cacheWriteTokens);
  const readPrice = price.cacheReadPerMTok ?? price.inputPerMTok;
  const writePrice = price.cacheWritePerMTok ?? price.inputPerMTok;
  const micro =
    uncached * price.inputPerMTok +
    usage.cacheReadTokens * readPrice +
    usage.cacheWriteTokens * writePrice +
    usage.outputTokens * price.outputPerMTok;
  return micro / 1_000_000;
}

export function recordUsage(
  caller: string,
  settings: ResolvedModelSettings,
  message: UsageCarrier,
): UsageRecord {
  const usage = extractTokenUsage(message);
  return {
    caller,
    model: settings.model,
    ...usage,
    costUsd: costOf(usage, settings.price),
    costSource: "price-table",
  };
}

export class InvalidToolCostError extends Error {
  override name = "InvalidToolCostError";
}

/** A paid tool's own cost, recorded like a model call: caller `tool:<name>`. */
export function recordToolCost(tool: string, costUsd: number): UsageRecord {
  if (!Number.isFinite(costUsd) || costUsd < 0) {
    throw new InvalidToolCostError(`Tool "${tool}" reported an invalid cost: ${String(costUsd)}`);
  }
  return { caller: `tool:${tool}`, model: tool, ...ZERO_USAGE, costUsd, costSource: "tool" };
}

export function totalCost(records: readonly UsageRecord[]): number {
  return records.reduce((sum, record) => sum + record.costUsd, 0);
}

export function buildCostReport(records: readonly UsageRecord[]): CostReport {
  const byCaller: Record<string, number> = {};
  for (const record of records) {
    byCaller[record.caller] = (byCaller[record.caller] ?? 0) + record.costUsd;
  }
  const cacheReadTokens = records.reduce((sum, record) => sum + record.cacheReadTokens, 0);
  return { totalUsd: totalCost(records), calls: records.length, cacheReadTokens, byCaller };
}
