import { z } from "zod";
import { ReasoningEffort } from "../models/reasoning.js";
import { CachedPart, CacheRetention } from "../models/prompt-caching.js";
/** Sentinel for maxTokens: do not cap output — the model may use its own maximum. */
export const MODEL_MAX = "max";
/** OpenRouter `reasoning.effort` levels. "none" disables thinking (not accepted by every model). */
export const THINKING_EFFORTS = ["none", "minimal", "low", "medium", "high", "xhigh"];
/** USD per 1M tokens — take from openrouter.ai/models. Cache prices fall back to input price. */
export const PriceSchema = z.object({
  inputPerMTok: z.number().nonnegative(),
  outputPerMTok: z.number().nonnegative(),
  cacheReadPerMTok: z.number().nonnegative().optional(),
  cacheWritePerMTok: z.number().nonnegative().optional(),
});
export const MaxTokensSchema = z.union([z.number().int().positive(), z.literal(MODEL_MAX)]);
/** A `Reasoning` value (`graphcompose/models`): `Reasoning.on({ effort, budget })`, `off()`, `modelDecides()`. */
export const ReasoningValueSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("model-decides") }),
  z.object({
    kind: z.literal("on"),
    effort: z.enum(ReasoningEffort).optional(),
    budget: z.object({ tokens: z.number().int().positive() }).optional(),
  }),
  z.object({ kind: z.literal("off") }),
]);
/**
 * A component's reasoning until #152 brings `reasoning` to the decorators: "default" = the model
 * decides, an effort level ("none" = off), `{ budgetTokens }`, or a `Reasoning` value.
 */
export const ThinkingSchema = z.union([
  z.literal("default"),
  z.enum(THINKING_EFFORTS),
  z.object({ budgetTokens: z.number().int().positive() }),
  ReasoningValueSchema,
]);
/** A `PromptCaching` value (`graphcompose/models`). */
export const PromptCachingValueSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("where-supported"),
    retention: z.enum(CacheRetention),
    cachedParts: z.array(z.enum(CachedPart)).min(1).readonly(),
    key: z.string().min(1).optional(),
  }),
  z.object({ kind: z.literal("off") }),
]);
/** A component's prompt caching until #152: true = the provider's, false = off, or a `PromptCaching`. */
export const CacheSettingSchema = z.union([z.boolean(), PromptCachingValueSchema]);
/** Output ceiling when a workflow sets none — a model stuck in a loop stops here. `MODEL_MAX` = no ceiling. */
export const DEFAULT_MAX_TOKENS = 8192;
/**
 * Defaults for every chat model (agents and LLM routers). Reasoning and caching default to the
 * model provider's (`@ModelProvider`); timeouts, retries and request fields live on the provider.
 */
export const ChatDefaultsSchema = z.object({
  temperature: z.number().min(0).max(2),
  /** Default 8 192 (`DEFAULT_MAX_TOKENS`); `MODEL_MAX` for no ceiling. */
  maxTokens: MaxTokensSchema.optional(),
  thinking: ThinkingSchema.optional(),
  cache: CacheSettingSchema.optional(),
});
export const ModelSettingsSchema = z.object({
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: MaxTokensSchema.optional(),
  thinking: ThinkingSchema.optional(),
  cache: CacheSettingSchema.optional(),
  /** Overrides the provider's price table; the provider's own cost comes first. */
  price: PriceSchema.optional(),
});
/**
 * Conversation memory: every `every` turns are compacted into one summary; readers see the latest
 * `keep` summaries plus the raw turns since. Summaries are never re-compacted (FIFO).
 */
export const CompactionSettingsSchema = z.object({
  every: z.number().int().min(2),
  keep: z.number().int().positive(),
  model: ModelSettingsSchema,
});
export const AgentSettingsSchema = ModelSettingsSchema.extend({
  description: z.string().min(1),
  /** Tool names from the registry (src/tools/catalog.ts). */
  tools: z.array(z.string()).optional(),
  /** How many previous Terns of the thread the agent sees. Default: defaults.history.limit. */
  historyLimit: z.number().int().nonnegative().optional(),
  /** How many latest summaries the agent sees (compaction). Default: defaults.history.summaries. */
  historySummaries: z.number().int().nonnegative().optional(),
  /** Tool calls per call of the agent; crossing it fails the run. Default: defaults.tools.maxToolCalls, else 20. */
  maxToolCalls: z.number().int().nonnegative().optional(),
  /** Knowledge bases the agent uses (from `@Agent({ rag })`): name, mode and passages per retrieval. */
  rag: z
    .array(
      z.object({
        name: z.string(),
        mode: z.enum(["tool", "context"]),
        topK: z.number().int().positive(),
      }),
    )
    .optional(),
});
/** Jev (TypeSafe) via OpenRouter Decisions API: probabilities over options, exact cost. */
export const JevRouterModelSchema = z.object({
  kind: z.literal("jev"),
  model: z.string().min(1),
});
/** A chat model asked to reply with JSON. */
export const LlmRouterModelSchema = ModelSettingsSchema.extend({ kind: z.literal("llm") });
export const RouterModelSchema = z.discriminatedUnion("kind", [
  JevRouterModelSchema,
  LlmRouterModelSchema,
]);
/** MCP server connection. Secrets are never here: only names of env variables. */
export const McpServerConfigSchema = z.discriminatedUnion("transport", [
  z.object({
    transport: z.literal("stdio"),
    command: z.string().min(1),
    args: z.array(z.string()).optional(),
    /** Names of env variables passed to the server process. */
    env: z.array(z.string()).optional(),
  }),
  z.object({
    transport: z.literal("http"),
    url: z.url(),
    /** Header name → name of the env variable holding its value. */
    headers: z.record(z.string(), z.string()).optional(),
  }),
]);
/** A guard: a two-option decision (flag / pass) with a threshold on P(flag). Texts: src/prompts/guards.ts. */
export const GuardSettingsSchema = z.object({
  threshold: z.number().min(0).max(1),
  /** Returned as the replyWith when the guard trips. */
  refusal: z.string().min(1),
  /** Omit to use defaults.router (Jev). */
  model: RouterModelSchema.optional(),
});
export const AgentsConfigSchema = z.object({
  /** Agent workflow id: key of the daily spend ledger. */
  name: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "lowercase letters, digits and dashes"),
  /** Readable config version (e.g. 1.3.0) — labels every run; profiles set their own. */
  version: z.string().min(1),
  defaults: z.object({
    models: ChatDefaultsSchema,
    router: RouterModelSchema,
    /** Tool calls per call of an agent (`agents.<name>.limits.toolCalls`); default 20. */
    tools: z.object({ maxToolCalls: z.number().int().nonnegative().optional() }).optional(),
    history: z.object({
      limit: z.number().int().nonnegative(),
      /** How many latest summaries readers see (compaction). Default: compaction.keep. */
      summaries: z.number().int().nonnegative().optional(),
    }),
  }),
  mcpServers: z.record(z.string(), McpServerConfigSchema).optional(),
  /** Conversation memory (off when absent). */
  compaction: CompactionSettingsSchema.optional(),
  /** Run in order; the first guard that trips stops the run. */
  guards: z
    .object({
      input: z.record(z.string(), GuardSettingsSchema).optional(),
      output: z.record(z.string(), GuardSettingsSchema).optional(),
    })
    .optional(),
  agents: z
    .record(z.string(), AgentSettingsSchema)
    .refine((agents) => Object.keys(agents).length > 0, "at least one agent is required"),
});
export class UnknownAgentToolError extends Error {
  name = "UnknownAgentToolError";
}
/** Validates at startup and keeps the literal type of the config; checks tool names if given. */
export function validateAgentsConfig(config, knownTools) {
  AgentsConfigSchema.parse(config);
  const unknown = Object.entries(config.agents).flatMap(([agent, settings]) =>
    (settings.tools ?? [])
      .filter((tool) => knownTools !== undefined && !knownTools.includes(tool))
      .map((tool) => `${agent} → ${tool}`),
  );
  if (unknown.length > 0) throw new UnknownAgentToolError(`Unknown tools: ${unknown.join(", ")}`);
  return config;
}
