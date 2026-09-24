import { z } from "zod";

/** Sentinel for maxTokens: do not cap output — the model may use its own maximum. */
export const MODEL_MAX = "max";

/** OpenRouter `reasoning.effort` levels. "none" disables thinking (not accepted by every model). */
export const THINKING_EFFORTS = ["none", "minimal", "low", "medium", "high", "xhigh"] as const;

/** USD per 1M tokens — take from openrouter.ai/models. Cache prices fall back to input price. */
export const PriceSchema = z.object({
  inputPerMTok: z.number().nonnegative(),
  outputPerMTok: z.number().nonnegative(),
  cacheReadPerMTok: z.number().nonnegative().optional(),
  cacheWritePerMTok: z.number().nonnegative().optional(),
});

export const MaxTokensSchema = z.union([z.number().int().positive(), z.literal(MODEL_MAX)]);

/** "default" = don't send anything, the model decides; effort level; or an explicit budget. */
export const ThinkingSchema = z.union([
  z.literal("default"),
  z.enum(THINKING_EFFORTS),
  z.object({ budgetTokens: z.number().int().positive() }),
]);

/** Defaults for every chat model (agents and LLM routers). */
export const ChatDefaultsSchema = z.object({
  temperature: z.number().min(0).max(2),
  maxTokens: MaxTokensSchema,
  thinking: ThinkingSchema,
  /** Prompt caching where the model supports it. */
  cache: z.boolean(),
});

export const ModelSettingsSchema = z.object({
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: MaxTokensSchema.optional(),
  thinking: ThinkingSchema.optional(),
  cache: z.boolean().optional(),
  price: PriceSchema,
});

export const AgentSettingsSchema = ModelSettingsSchema.extend({
  description: z.string().min(1),
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

export const RouterSettingsSchema = z.object({
  maxHops: z.number().int().positive(),
  /** Omit to use defaults.router (Jev). */
  model: RouterModelSchema.optional(),
});

export const AgentsConfigSchema = z.object({
  /** Agent bundle id: key of the daily spend ledger. */
  name: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "lowercase letters, digits and dashes"),
  defaults: z.object({ chat: ChatDefaultsSchema, router: RouterModelSchema }),
  budget: z.object({
    /** USD one run may spend. */
    runBudgetCap: z.number().positive(),
    /** USD this agent bundle may spend per UTC day; resets at 00:00 UTC. */
    dailyBudgetCap: z.number().positive(),
  }),
  routers: z.object({ main: RouterSettingsSchema }).catchall(RouterSettingsSchema),
  agents: z
    .record(z.string(), AgentSettingsSchema)
    .refine((agents) => Object.keys(agents).length > 0, "at least one agent is required"),
});

export type Price = z.infer<typeof PriceSchema>;
export type MaxTokens = z.infer<typeof MaxTokensSchema>;
export type Thinking = z.infer<typeof ThinkingSchema>;
export type ChatDefaults = z.infer<typeof ChatDefaultsSchema>;
export type ModelSettings = z.infer<typeof ModelSettingsSchema>;
export type AgentSettings = z.infer<typeof AgentSettingsSchema>;
export type RouterModel = z.infer<typeof RouterModelSchema>;
export type RouterSettings = z.infer<typeof RouterSettingsSchema>;
export type AgentsConfig = z.infer<typeof AgentsConfigSchema>;

/** Config whose agent names are a literal union — lets the compiler check prompts and routing. */
export type AgentsConfigOf<TName extends string> = Omit<AgentsConfig, "agents"> & {
  readonly agents: Readonly<Record<TName, AgentSettings>>;
};

/** One system prompt per configured agent; a missing prompt is a compile error. */
export type AgentPrompts<TName extends string> = Readonly<Record<TName, string>>;

/** Chat model settings after defaults are applied — what a model factory receives. */
export interface ResolvedModelSettings {
  readonly model: string;
  readonly temperature: number;
  readonly maxTokens: MaxTokens;
  readonly thinking: Thinking;
  readonly cache: boolean;
  readonly price: Price;
}

/** A router's model: its own override or the default (Jev). */
export function resolveRouterModel(
  router: RouterSettings,
  defaults: AgentsConfig["defaults"],
): RouterModel {
  return router.model ?? defaults.router;
}

/** Validates at startup and keeps the literal type of the config. */
export function validateAgentsConfig<TConfig extends AgentsConfig>(config: TConfig): TConfig {
  AgentsConfigSchema.parse(config);
  return config;
}
