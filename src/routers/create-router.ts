import type { ChatDefaults, RouterModel } from "../config/types.js";
import type { JevClient } from "../llm/jev-client.js";
import { resolveSettings, type ModelFactory } from "../llm/registry.js";
import { createJevRouter } from "./jev-router.js";
import { createLlmRouter } from "./llm-router.js";
import type { Router } from "./types.js";

export interface RouterFactories {
  readonly chatModel: ModelFactory;
  readonly jevClient: JevClient;
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
      return createJevRouter({ name, model: model.model, client: factories.jevClient });
    case "llm": {
      const settings = resolveSettings(model, chatDefaults);
      return createLlmRouter({ name, model: factories.chatModel(settings), settings });
    }
  }
}
