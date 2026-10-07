import { resolveSettings } from "../llm/registry.js";
import { ModelPurpose } from "./resolve.js";
/** Jev (`typesafe/jev-1.13`, …) decides through the Decisions API; anything else is a chat model. */
export const isJevModel = (model) => /(^|\/)jev-/.test(model);
const routerUse = (key, model, config) => model.kind === "jev"
    ? { key, model: model.model, purpose: ModelPurpose.Decision }
    : {
        key,
        model: model.model,
        purpose: ModelPurpose.Chat,
        settings: resolveSettings(model, config.defaults.models),
    };
const guardUses = (config) => ["input", "output"].flatMap((side) => Object.entries(config.guards?.[side] ?? {}).flatMap(([name, guard]) => guard.model === undefined ? [] : [routerUse(`guards.${side}.${name}`, guard.model, config)]));
/** Every model use of a workflow: agents, compaction, the default router, guards and flow routers. */
export function modelUsesOf(config, routers) {
    const chat = (key, settings) => ({
        key,
        model: settings.model,
        purpose: ModelPurpose.Chat,
        settings: resolveSettings(settings, config.defaults.models),
    });
    return [
        ...Object.entries(config.agents).map(([name, agent]) => chat(`agents.${name}`, agent)),
        ...(config.compaction === undefined ? [] : [chat("compaction", config.compaction.model)]),
        routerUse("defaults.router", config.defaults.router, config),
        ...guardUses(config),
        ...routers.map((router) => isJevModel(router.model)
            ? { key: `routers.${router.name}`, model: router.model, purpose: ModelPurpose.Decision }
            : { key: `routers.${router.name}`, model: router.model, purpose: ModelPurpose.Chat }),
    ];
}
