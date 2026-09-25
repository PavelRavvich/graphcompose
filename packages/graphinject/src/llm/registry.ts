import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { DEFAULT_MAX_RETRIES, DEFAULT_MAX_TOKENS, DEFAULT_TIMEOUT_MS } from "../config/types.js";
import type {
  AgentsConfigOf,
  ChatDefaults,
  ModelSettings,
  ResolvedModelSettings,
} from "../config/types.js";

/** A model together with the settings (and price) it was created from. */
export interface ModelBinding {
  readonly model: BaseChatModel;
  readonly settings: ResolvedModelSettings;
}

export type ModelFactory = (settings: ResolvedModelSettings) => BaseChatModel;

/** Chat models of the agents. The router is built separately (see src/routing). */
export interface ModelRegistry {
  readonly agents: ReadonlyMap<string, ModelBinding>;
  /** For agents with `reasoning`: the model per attempt (thinking from the attempt's level). */
  readonly attempts: ReadonlyMap<string, readonly ModelBinding[]>;
  /** The conversation-compaction model, when the workflow compacts. */
  readonly compaction?: ModelBinding | undefined;
}

/** The workflow's chat defaults with the framework's own filled in. */
const completeDefaults = (defaults: ChatDefaults) => ({
  ...defaults,
  maxTokens: defaults.maxTokens ?? DEFAULT_MAX_TOKENS,
  timeoutMs: defaults.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  maxRetries: defaults.maxRetries ?? DEFAULT_MAX_RETRIES,
});

/** An agent's (or LLM router's) model settings over the chat defaults. */
export function resolveSettings(
  settings: ModelSettings,
  defaults: ChatDefaults,
): ResolvedModelSettings {
  const d = completeDefaults(defaults);
  const provider = settings.provider ?? d.provider;
  return {
    model: settings.model,
    temperature: settings.temperature ?? d.temperature,
    maxTokens: settings.maxTokens ?? d.maxTokens,
    thinking: settings.thinking ?? d.thinking,
    cache: settings.cache ?? d.cache,
    timeoutMs: settings.timeoutMs ?? d.timeoutMs,
    maxRetries: settings.maxRetries ?? d.maxRetries,
    ...(provider === undefined ? {} : { provider }),
    price: settings.price,
  };
}

/** Builds one binding per agent; identical settings share one client. */
export function createModelRegistry(
  config: AgentsConfigOf<string>,
  factory: ModelFactory,
): ModelRegistry {
  const cache = new Map<string, BaseChatModel>();
  const bind = (settings: ModelSettings): ModelBinding => {
    const resolved = resolveSettings(settings, config.defaults.chat);
    const key = JSON.stringify([
      resolved.model,
      resolved.temperature,
      resolved.maxTokens,
      resolved.thinking,
      resolved.cache,
    ]);
    const model = cache.get(key) ?? factory(resolved);
    cache.set(key, model);
    return { model, settings: resolved };
  };
  const agents = new Map(
    Object.entries(config.agents).map(([name, settings]) => [name, bind(settings)] as const),
  );
  const attempts = new Map(
    Object.entries(config.agents).flatMap(([name, settings]) => {
      const reasoning = settings.reasoning;
      if (reasoning === undefined) return [];
      const levels = Array.from(
        { length: reasoning.maxAttempts },
        (_, i) => reasoning.thinking[Math.min(i, reasoning.thinking.length - 1)] ?? "default",
      );
      const byLevel = new Map(
        [...new Set(levels)].map(
          (level) => [level, bind({ ...settings, thinking: level })] as const,
        ),
      );
      return [[name, levels.map((level) => byLevel.get(level) ?? bind(settings))] as const];
    }),
  );
  const compaction = config.compaction === undefined ? undefined : bind(config.compaction.model);
  return { agents, attempts, compaction };
}
