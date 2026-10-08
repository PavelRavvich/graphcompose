import { compareNames } from "../llm/canonical-order.js";
import { createJevClient } from "../llm/jev-client.js";
import { minutes, seconds } from "../units/index.js";
import type { ModelCapabilities } from "./capabilities.js";
import { ModelCost } from "./cost.js";
import { EnvironmentVariable } from "./environment-variable.js";
import type { DecideRequest, ModelProviderHandler } from "./handler.js";
import { ModelProvider } from "./model-provider.decorator.js";
import { PromptCaching } from "./prompt-caching.js";
import { Reasoning } from "./reasoning.js";
import { RetryPolicy, TRANSIENT_FAILURES } from "./retry-policy.js";

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/** OpenRouter's base URL, `OPENROUTER_BASE_URL` overriding it (a proxy, a local stub). */
export const OPENROUTER_BASE_URL_SETTING = EnvironmentVariable.named("OPENROUTER_BASE_URL", {
  secret: false,
  defaultValue: OPENROUTER_BASE_URL,
});

export const OPENROUTER_API_KEY = EnvironmentVariable.named("OPENROUTER_API_KEY", { secret: true });

/** Jev models the Decisions API serves; a subclass lists more (`override readonly knownModels`). */
export const JEV_MODELS: readonly string[] = ["typesafe/jev-1.13", "typesafe/jev-router"];

/**
 * Jev on OpenRouter's Decisions API: calibrated probabilities over fixed options, the exact cost in
 * every replyWith. Serves `typesafe/jev-*` for routers, guards and judges — decisions only, no chat.
 */
@ModelProvider({
  name: "jev",
  description: "Jev decisions on OpenRouter's Decisions API",
  serves: [/^typesafe\/jev-/],
  baseUrl: OPENROUTER_BASE_URL_SETTING,
  apiKey: OPENROUTER_API_KEY,
  timeout: seconds(30),
  cost: ModelCost.fromResponse(),
  reasoning: Reasoning.modelDecides(),
  promptCaching: PromptCaching.off(),
  retryPolicy: RetryPolicy.exponential({
    maxAttempts: 3,
    initialDelay: seconds(1),
    maxDelay: seconds(10),
    jitter: true,
    retryOn: TRANSIENT_FAILURES,
  }),
  circuitBreakerPolicy: { failureThreshold: 5, window: minutes(1), openFor: seconds(30) },
})
export class JevModelProvider implements ModelProviderHandler {
  readonly knownModels: readonly string[] = JEV_MODELS;

  /** Options sorted by name: declaration order changes neither the request nor its fingerprint. */
  routeTo({ decision, connection }: DecideRequest): Promise<unknown> {
    const questions = Object.fromEntries(
      Object.entries(decision.questions).map(([id, question]) => [
        id,
        {
          ...question,
          criteria: Object.fromEntries(
            Object.entries(question.criteria).sort(([a], [b]) => compareNames(a, b)),
          ),
        },
      ]),
    );
    const client = createJevClient(
      { apiKey: connection.apiKey ?? "", baseUrl: connection.baseUrl },
      connection.fetch,
    );
    return client({ ...decision, questions });
  }

  capabilities(model: string): Promise<ModelCapabilities | undefined> {
    return Promise.resolve(this.knownModels.includes(model) ? { model } : undefined);
  }
}
