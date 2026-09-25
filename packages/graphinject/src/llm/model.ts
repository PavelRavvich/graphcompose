import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOpenAI } from "@langchain/openai";
import {
  MODEL_MAX,
  type ProviderPreferences,
  type ResolvedModelSettings,
  type Thinking,
} from "../config/types.js";

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export interface OpenRouterConnection {
  readonly apiKey: string;
  readonly baseUrl: string;
}

/** OpenRouter `reasoning` request object. */
export type ReasoningParams =
  | { readonly effort: string; readonly exclude: true }
  | { readonly max_tokens: number; readonly exclude: true };

export class ModelConfigError extends Error {
  override name = "ModelConfigError";
}

/** The only place that reads LLM credentials from the environment. */
export function readOpenRouterEnv(env: NodeJS.ProcessEnv = process.env): OpenRouterConnection {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) throw new ModelConfigError("OPENROUTER_API_KEY is not set");
  return { apiKey, baseUrl: env.OPENROUTER_BASE_URL ?? OPENROUTER_BASE_URL };
}

/** Maps config thinking to OpenRouter `reasoning`. Thoughts are billed but not returned. */
export function reasoningParams(thinking: Thinking): ReasoningParams | undefined {
  if (thinking === "default") return undefined;
  if (typeof thinking === "string") return { effort: thinking, exclude: true };
  return { max_tokens: thinking.budgetTokens, exclude: true };
}

/** OpenRouter is OpenAI-compatible: ChatOpenAI + custom base URL, model slug from config. */
/** OpenRouter request fields LangChain passes through: reasoning and provider routing (snake_case on the wire). */
function openRouterKwargs(
  reasoning: ReturnType<typeof reasoningParams>,
  provider: ProviderPreferences | undefined,
): Record<string, unknown> {
  const routing =
    provider === undefined
      ? undefined
      : {
          ...(provider.order === undefined ? {} : { order: provider.order }),
          ...(provider.only === undefined ? {} : { only: provider.only }),
          ...(provider.ignore === undefined ? {} : { ignore: provider.ignore }),
          ...(provider.sort === undefined ? {} : { sort: provider.sort }),
          ...(provider.allowFallbacks === undefined
            ? {}
            : { allow_fallbacks: provider.allowFallbacks }),
        };
  return { ...(reasoning ? { reasoning } : {}), ...(routing ? { provider: routing } : {}) };
}

export function createChatModel(
  settings: ResolvedModelSettings,
  connection: OpenRouterConnection,
): BaseChatModel {
  const reasoning = reasoningParams(settings.thinking);
  return new ChatOpenAI({
    apiKey: connection.apiKey,
    model: settings.model,
    temperature: settings.temperature,
    ...(settings.maxTokens === MODEL_MAX ? {} : { maxTokens: settings.maxTokens }),
    ...(reasoning || settings.provider
      ? { modelKwargs: openRouterKwargs(reasoning, settings.provider) }
      : {}),
    // LangChain's own request timeout and retries (with backoff) — a stalled request fails, not hangs
    timeout: settings.timeoutMs,
    maxRetries: settings.maxRetries,
    configuration: {
      baseURL: connection.baseUrl,
      defaultHeaders: { "X-Title": "langgraph-ts-template" },
    },
  });
}
