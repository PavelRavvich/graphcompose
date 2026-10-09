import { DEFAULT_MAX_TOKENS } from "../config/types.js";
import { promptCachingOfSetting } from "../models/prompt-caching.js";
import { reasoningOfThinking } from "../models/reasoning.js";
/**
 * An agent's (or LLM router's) model settings over the chat defaults. Reasoning and caching set
 * nowhere stay unset: the model provider's own apply.
 */
export function resolveSettings(settings, defaults) {
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
export function createModelRegistry(config, gateway) {
  const bindFor = (user) => (settings) => {
    const resolved = resolveSettings(settings, config.defaults.models);
    return { model: gateway.chatModel({ user, settings: resolved }), settings: resolved };
  };
  const agents = new Map(
    Object.entries(config.agents).map(([name, settings]) => [
      name,
      bindFor({ kind: "agent", agent: name })(settings),
    ]),
  );
  const compaction =
    config.compaction === undefined
      ? undefined
      : bindFor({ kind: "compaction" })(config.compaction.model);
  return { agents, compaction };
}
