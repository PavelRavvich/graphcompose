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
  /** Tool names from the registry (src/tools/catalog.ts). */
  tools: z.array(z.string()).optional(),
  /** Crossing it fails the run (fail fast). Default: defaults.tools.maxToolCalls. */
  maxToolCalls: z.number().int().nonnegative().optional(),
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
  /** Returned as the answer when the guard trips. */
  refusal: z.string().min(1),
  /** Omit to use defaults.router (Jev). */
  model: RouterModelSchema.optional(),
});

export const AgentsConfigSchema = z.object({
  /** Agent bundle id: key of the daily spend ledger. */
  name: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "lowercase letters, digits and dashes"),
  defaults: z.object({
    chat: ChatDefaultsSchema,
    router: RouterModelSchema,
    tools: z.object({ maxToolCalls: z.number().int().nonnegative() }),
  }),
  budget: z.object({
    /** USD one run may spend. */
    runBudgetCap: z.number().positive(),
    /** USD this agent bundle may spend per UTC day; resets at 00:00 UTC. */
    dailyBudgetCap: z.number().positive(),
    /** USD per UTC day for eval and replay, kept apart from production spend. */
    evalBudgetCap: z.number().positive(),
  }),
  routers: z.object({ main: RouterSettingsSchema }).catchall(RouterSettingsSchema),
  mcpServers: z.record(z.string(), McpServerConfigSchema).optional(),
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

export type Price = z.infer<typeof PriceSchema>;
export type MaxTokens = z.infer<typeof MaxTokensSchema>;
export type Thinking = z.infer<typeof ThinkingSchema>;
export type ChatDefaults = z.infer<typeof ChatDefaultsSchema>;
export type ModelSettings = z.infer<typeof ModelSettingsSchema>;
export type AgentSettings = z.infer<typeof AgentSettingsSchema>;
export type RouterModel = z.infer<typeof RouterModelSchema>;
export type RouterSettings = z.infer<typeof RouterSettingsSchema>;
export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;
export type GuardSettings = z.infer<typeof GuardSettingsSchema>;
export type AgentsConfig = z.infer<typeof AgentsConfigSchema>;

/** An agent whose tool names are a literal union — a typo does not compile. */
export type AgentSettingsOf<TTool extends string> = Omit<AgentSettings, "tools"> & {
  readonly tools?: readonly TTool[];
};

/** Config with literal agent and tool names — the compiler checks prompts, routing and tools. */
export type AgentsConfigOf<TName extends string, TTool extends string = string> = Omit<
  AgentsConfig,
  "agents"
> & {
  readonly agents: Readonly<Record<TName, AgentSettingsOf<TTool>>>;
};

export class UnknownAgentToolError extends Error {
  override name = "UnknownAgentToolError";
}

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

/** Validates at startup and keeps the literal type of the config; checks tool names if given. */
export function validateAgentsConfig<TConfig extends AgentsConfigOf<string>>(
  config: TConfig,
  knownTools?: readonly string[],
): TConfig {
  AgentsConfigSchema.parse(config);
  const unknown = Object.entries(config.agents).flatMap(([agent, settings]) =>
    (settings.tools ?? [])
      .filter((tool) => knownTools !== undefined && !knownTools.includes(tool))
      .map((tool) => `${agent} → ${tool}`),
  );
  if (unknown.length > 0) throw new UnknownAgentToolError(`Unknown tools: ${unknown.join(", ")}`);
  return config;
}
