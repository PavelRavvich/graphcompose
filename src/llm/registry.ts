import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type {
  AgentsConfig,
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
export function createModelRegistry(config: AgentsConfig, factory: ModelFactory): ModelRegistry {
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
  return { agents };
}
