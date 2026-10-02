import type { AgentsConfigOf, ChatDefaults, ModelSettings, RouterModel } from "../config/types.js";
import type { ModelGateway } from "../llm/gateway.js";
import { createRouter, type Router } from "../routers/index.js";
import type { LoadedRouter } from "./router-texts.js";

import { isJevModel } from "../models/uses.js";

export { isJevModel };

export interface FlowRouterFactoryDeps {
  readonly gateway: ModelGateway;
  readonly chatDefaults: ChatDefaults;
  /** Settings (price) of a chat model used as a router, by model id. */
  readonly chatModelSettings: (model: string) => ModelSettings;
}

/** A router's model by its id: Jev, or a chat model with the settings the registry knows. */
export function routerModelOf(model: string, deps: FlowRouterFactoryDeps): RouterModel {
  return isJevModel(model)
    ? { kind: "jev", model }
    : { ...deps.chatModelSettings(model), kind: "llm", model };
}

/** `FlowRuntime.routerFor` through the existing routers (one route → no call). */
export function flowRouterFactory(deps: FlowRouterFactoryDeps): (router: LoadedRouter) => Router {
  return (router) =>
    createRouter(router.name, routerModelOf(router.model, deps), deps.chatDefaults, deps.gateway);
}

/**
 * A router on a chat model: priced like the agent (or compaction) that uses the same model when one
 * has a price; otherwise its provider reports the cost (or prices it from its table).
 */
export function chatModelSettingsOf(
  config: AgentsConfigOf<string>,
): (model: string) => ModelSettings {
  const known: readonly ModelSettings[] = [
    ...Object.values(config.agents),
    ...(config.compaction === undefined ? [] : [config.compaction.model]),
  ];
  return (model) => {
    const price = known.find((candidate) => candidate.model === model)?.price;
    return price === undefined ? { model } : { model, price };
  };
}
