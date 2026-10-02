import type { AgentsConfigOf, ResolvedModelSettings, RouterModel } from "../config/types.js";
import { resolveSettings } from "../llm/registry.js";
import { ModelPurpose } from "./resolve.js";

/** One place a model is used, with the settings it is used with. */
export interface ModelUse {
  /** Where it is set: `agents.scout`, `routers.main`, `defaults.router`, `compaction`, `guards.input.pii`. */
  readonly key: string;
  readonly model: string;
  readonly purpose: ModelPurpose;
  /** Chat uses: the settings over the chat defaults (reasoning and caching unset = the provider's). */
  readonly settings?: ResolvedModelSettings;
}

/** A router that names its model (`@Router({ model })`). */
export interface ModelNamingRouter {
  readonly name: string;
  readonly model: string;
}

/** Jev (`typesafe/jev-1.13`, …) decides through the Decisions API; anything else is a chat model. */
export const isJevModel = (model: string): boolean => /(^|\/)jev-/.test(model);

const routerUse = (key: string, model: RouterModel, config: AgentsConfigOf<string>): ModelUse =>
  model.kind === "jev"
    ? { key, model: model.model, purpose: ModelPurpose.Decision }
    : {
        key,
        model: model.model,
        purpose: ModelPurpose.Chat,
        settings: resolveSettings(model, config.defaults.chat),
      };

const guardUses = (config: AgentsConfigOf<string>): ModelUse[] =>
  (["input", "output"] as const).flatMap((side) =>
    Object.entries(config.guards?.[side] ?? {}).flatMap(([name, guard]) =>
      guard.model === undefined ? [] : [routerUse(`guards.${side}.${name}`, guard.model, config)],
    ),
  );

/** Every model use of a workflow: agents, compaction, the default router, guards and flow routers. */
export function modelUsesOf(
  config: AgentsConfigOf<string>,
  routers: readonly ModelNamingRouter[],
): readonly ModelUse[] {
  const chat = (key: string, settings: Parameters<typeof resolveSettings>[0]): ModelUse => ({
    key,
    model: settings.model,
    purpose: ModelPurpose.Chat,
    settings: resolveSettings(settings, config.defaults.chat),
  });
  return [
    ...Object.entries(config.agents).map(([name, agent]) => chat(`agents.${name}`, agent)),
    ...(config.compaction === undefined ? [] : [chat("compaction", config.compaction.model)]),
    routerUse("defaults.router", config.defaults.router, config),
    ...guardUses(config),
    ...routers.map((router): ModelUse =>
      isJevModel(router.model)
        ? { key: `routers.${router.name}`, model: router.model, purpose: ModelPurpose.Decision }
        : { key: `routers.${router.name}`, model: router.model, purpose: ModelPurpose.Chat },
    ),
  ];
}
