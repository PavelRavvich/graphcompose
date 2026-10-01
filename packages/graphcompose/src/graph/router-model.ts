import type { AgentsConfigOf, ChatDefaults, ModelSettings, RouterModel } from "../config/types.js";
import { createRouter, type Router, type RouterFactories } from "../routers/index.js";
import type { LoadedRouter } from "./router-texts.js";

/** Jev (`typesafe/jev-1.13`, …) decides through the Decisions API; anything else is a chat model. */
export const isJevModel = (model: string): boolean => /(^|\/)jev-/.test(model);

export interface FlowRouterFactoryDeps {
  readonly factories: RouterFactories;
  readonly chatDefaults: ChatDefaults;
  /** Settings (price, …) of a chat model used as a router, by model id. */
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
    createRouter(router.name, routerModelOf(router.model, deps), deps.chatDefaults, deps.factories);
}

export class UnknownRouterModelError extends Error {
  override name = "UnknownRouterModelError";
}

/** A router on a chat model is priced like the agent (or compaction) that uses the same model. */
export function chatModelSettingsOf(
  config: AgentsConfigOf<string>,
): (model: string) => ModelSettings {
  const known: readonly ModelSettings[] = [
    ...Object.values(config.agents),
    ...(config.compaction === undefined ? [] : [config.compaction.model]),
  ];
  return (model) => {
    const settings = known.find((candidate) => candidate.model === model);
    if (settings === undefined) {
      throw new UnknownRouterModelError(
        `Router model "${model}" has no price: use Jev (typesafe/jev-*) or a model an agent uses`,
      );
    }
    return { model, price: settings.price };
  };
}
