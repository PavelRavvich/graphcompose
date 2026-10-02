import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { DEFAULT_MAX_RETRIES, DEFAULT_MAX_TOKENS, DEFAULT_TIMEOUT_MS } from "../config/types.js";
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
