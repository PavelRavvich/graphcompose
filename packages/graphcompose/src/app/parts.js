import { chatModelSettingsOf, flowRouterFactory } from "../graph/router-model.js";
import { buildGuards } from "../guards/index.js";
import { guardPrompts } from "../prompts/guards.js";
import { createRouter } from "../routers/index.js";
export class UnknownToolError extends Error {
    name = "UnknownToolError";
}
export class UnknownActionError extends Error {
    name = "UnknownActionError";
}
/** Tool lookup for the graph; an unknown name is a wiring bug. */
export const toolLookup = (tools) => {
    const byName = new Map(tools.map((tool) => [tool.name, tool]));
    return (name) => {
        const tool = byName.get(name);
        if (tool === undefined)
            throw new UnknownToolError(`Unknown tool "${name}"`);
        return tool;
    };
};
/** Eval / replay: a Jev judge, spend on `<workflow>:eval` — its own day, capped like the workflow's. */
/** Action lookup for the graph. */
export const actionLookup = (bundle, services) => {
    const actionsMap = bundle.actions?.(services);
    if (!actionsMap)
        return undefined;
    return (name) => {
        const action = actionsMap.get(name);
        if (action === undefined)
            throw new UnknownActionError(`Unknown action "${name}"`);
        return action;
    };
};
export const evaluationFor = (bundle, stores, gateway) => ({
    ...stores,
    judge: createRouter("judge", bundle.config.defaults.router, bundle.config.defaults.models, gateway),
    account: {
        key: `${bundle.config.name}:eval`,
        dailyCap: bundle.limits.perDay?.cost ?? Number.POSITIVE_INFINITY,
    },
});
/** Core services for the workflow's components; one object, so tools and knowledge share instances. */
export const servicesFor = (bundle, gateway, env, container) => ({
    router: (name) => createRouter(name, bundle.config.defaults.router, bundle.config.defaults.models, gateway),
    env,
    container,
});
/** Context-mode knowledge bases per agent, when the workflow has any. */
export function knowledgeFor(bundle, services) {
    const byAgent = bundle.knowledge?.(services);
    return byAgent === undefined ? {} : { knowledge: (agent) => byAgent.get(agent) ?? [] };
}
/** The pause seam, when the workflow has tools that wait for an approval; on the app's checkpointer. */
export const pauseFor = (bundle, checkpointer) => ({
    checkpointer,
});
/** Guards from config + their texts; each guard is a router (Jev unless it sets a model). */
export const guardsFor = (config, gateway) => buildGuards(config.guards, guardPrompts, (name, model) => createRouter(`guard:${name}`, model ?? config.defaults.router, config.defaults.models, gateway));
/** The workflow's flow, limits and routers; each router decides on its own model. */
export const flowFor = (bundle, config, gateway) => ({
    flow: bundle.flow,
    limits: bundle.limits,
    routers: bundle.routers,
    routerFor: flowRouterFactory({
        gateway,
        chatDefaults: config.defaults.models,
        chatModelSettings: chatModelSettingsOf(config),
    }),
});
