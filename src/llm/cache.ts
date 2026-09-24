import { SystemMessage, type BaseMessage } from "@langchain/core/messages";
import type { ResolvedModelSettings } from "../config/types.js";

/**
 * Providers whose prompt caching needs explicit `cache_control` breakpoints.
 * Others on OpenRouter (OpenAI, DeepSeek, Moonshot/Kimi, Grok…) cache automatically.
 */
const EXPLICIT_CACHE_PROVIDERS: readonly string[] = ["anthropic/", "google/"];

export function needsCacheBreakpoint(
  settings: Pick<ResolvedModelSettings, "model" | "cache">,
): boolean {
  return (
    settings.cache && EXPLICIT_CACHE_PROVIDERS.some((prefix) => settings.model.startsWith(prefix))
  );
}

/** Marks the system prompt (the stable prefix) as cacheable when the model needs it. */
export function withCacheBreakpoint(
  messages: BaseMessage[],
  settings: Pick<ResolvedModelSettings, "model" | "cache">,
): BaseMessage[] {
  const [first, ...rest] = messages;
  if (!needsCacheBreakpoint(settings) || first === undefined || !SystemMessage.isInstance(first)) {
    return messages;
  }
  const cached = new SystemMessage({
    content: [{ type: "text", text: first.text, cache_control: { type: "ephemeral" } }],
  });
  return [cached, ...rest];
}
