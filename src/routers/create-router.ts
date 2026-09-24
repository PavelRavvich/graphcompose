import type { ChatDefaults, RouterModel } from "../config/types.js";
import type { JevClient } from "../llm/jev-client.js";
import { resolveSettings, type ModelFactory } from "../llm/registry.js";
import { createJevRouter } from "./jev-router.js";
import { createLlmRouter } from "./llm-router.js";
import { decided, failed } from "./outcome.js";
import type { Router } from "./types.js";

export interface RouterFactories {
  readonly chatModel: ModelFactory;
  readonly jevClient: JevClient;
}

/**
 * One option = an unconditional step, no options = nothing to decide: neither pays for a call.
 */
export function withTrivialOptions(router: Router): Router {
  return {
    name: router.name,
    route: (request) => {
      const [only, ...rest] = request.options;
      if (only === undefined) return Promise.resolve(failed("no options to route to"));
      if (rest.length === 0)
        return Promise.resolve(decided({ next: only.name, reason: "single option" }));
      return router.route(request);
    },
  };
}

/** Builds a router from its model config (use resolveRouterModel for the Jev default). */
export function createRouter(
  name: string,
  model: RouterModel,
  chatDefaults: ChatDefaults,
  factories: RouterFactories,
): Router {
  switch (model.kind) {
    case "jev":
      return withTrivialOptions(
        createJevRouter({ name, model: model.model, client: factories.jevClient }),
      );
    case "llm": {
      const settings = resolveSettings(model, chatDefaults);
      return withTrivialOptions(
        createLlmRouter({ name, model: factories.chatModel(settings), settings }),
      );
    }
  }
}
