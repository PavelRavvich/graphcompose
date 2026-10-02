import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { DEFAULT_MAX_TOKENS } from "../config/types.js";
import { promptCachingOfSetting } from "../models/prompt-caching.js";
import { reasoningOfThinking } from "../models/reasoning.js";
import type { ChatModelUser, ModelGateway } from "./gateway.js";
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
  /** The conversation-compaction model, when the workflow compacts. */
  readonly compaction?: ModelBinding | undefined;
}

/**
 * An agent's (or LLM router's) model settings over the chat defaults. Reasoning and caching set
 * nowhere stay unset: the model provider's own apply.
 */
export function resolveSettings(
  settings: ModelSettings,
  defaults: ChatDefaults,
): ResolvedModelSettings {
  const thinking = settings.thinking ?? defaults.thinking;
  const promptCaching = promptCachingOfSetting(settings.cache ?? defaults.cache);
  return {
    model: settings.model,
    temperature: settings.temperature ?? defaults.temperature,
    maxTokens: settings.maxTokens ?? defaults.maxTokens ?? DEFAULT_MAX_TOKENS,
    ...(thinking === undefined ? {} : { reasoning: reasoningOfThinking(thinking) }),
    ...(promptCaching === undefined ? {} : { promptCaching }),
    ...(settings.price === undefined ? {} : { price: settings.price }),
  };
}

/** Builds one binding per agent; each model comes from the gateway (which shares identical ones). */
export function createModelRegistry(
  config: AgentsConfigOf<string>,
  gateway: Pick<ModelGateway, "chatModel">,
): ModelRegistry {
  const bindFor =
    (user: ChatModelUser) =>
    (settings: ModelSettings): ModelBinding => {
      const resolved = resolveSettings(settings, config.defaults.chat);
      return { model: gateway.chatModel({ user, settings: resolved }), settings: resolved };
    };
  const agents = new Map(
    Object.entries(config.agents).map(
      ([name, settings]) => [name, bindFor({ kind: "agent", agent: name })(settings)] as const,
    ),
  );
  const compaction =
    config.compaction === undefined
      ? undefined
      : bindFor({ kind: "compaction" })(config.compaction.model);
  return { agents, compaction };
}
