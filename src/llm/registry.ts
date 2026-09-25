import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
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
}

export function resolveSettings(
  settings: ModelSettings,
  defaults: ChatDefaults,
): ResolvedModelSettings {
  return {
    model: settings.model,
    temperature: settings.temperature ?? defaults.temperature,
    maxTokens: settings.maxTokens ?? defaults.maxTokens,
    thinking: settings.thinking ?? defaults.thinking,
    cache: settings.cache ?? defaults.cache,
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
  return { agents, attempts };
}
