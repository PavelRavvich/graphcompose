import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { ResolvedModelSettings } from "../config/types.js";
import { recordUsage } from "../finops/usage.js";
import { withCacheBreakpoint } from "../llm/cache.js";
import { parseRouterDecision } from "./decision.js";
import { decided, errorReason, failed } from "./outcome.js";
import { llmRouterPrompt } from "./prompts.js";
import { routerCaller, type RouteOption, type Router } from "./types.js";

export interface LlmRouterDeps {
  readonly name: string;
  readonly model: BaseChatModel;
  readonly settings: ResolvedModelSettings;
}

const describeOptions = (options: readonly RouteOption[]): string =>
  options.map((option) => `- ${option.name}: ${option.description}`).join("\n");

/** Chat model asked for JSON; output validated with zod; priced from the config table. */
export function createLlmRouter(deps: LlmRouterDeps): Router {
  const caller = routerCaller(deps.name);
  return {
    name: deps.name,
    route: async (request) => {
      try {
        const prompt = await llmRouterPrompt.formatMessages({
          options: describeOptions(request.options),
          input: request.input,
        });
        const response = await deps.model.invoke(withCacheBreakpoint(prompt, deps.settings));
        const usage = recordUsage(caller, deps.settings, response);
        const allowed = new Set(request.options.map((option) => option.name));
        const decision = parseRouterDecision(response.text, allowed);
        return decision ? decided(decision, usage) : failed("invalid router output", usage);
      } catch (error) {
        return failed(errorReason(error), recordUsage(caller, deps.settings, {}));
      }
    },
  };
}
