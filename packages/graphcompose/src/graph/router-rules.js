import { isSelf, isReturn, isEnd, labelOf } from "./flow.js";
import { routerMetaOf } from "./router.decorator.js";
import { violation } from "./rule-error.js";
import { targetsOf } from "./rules.js";
const SELF_LABEL = "Self";
const hasText = (source) => {
    if (source.promptUrls && source.promptUrls.length > 0)
        return true;
    return (source.prompt ?? "").trim() !== "";
};
const routeHasText = (declaration) => hasText(declaration);
function textRules(router, meta) {
    const found = [];
    if (!hasText(meta)) {
        const message = `router ${router.label} has no instructions`;
        found.push(violation("router.no-prompt", message, [router.label]));
    }
    for (const declaration of meta.routes.filter((item) => !routeHasText(item))) {
        const message = `router ${router.label}: the route to ${labelOf(declaration.target)} has no text`;
        found.push(violation("router.empty-route-text", message, [router.label]));
    }
    return found;
}
/** A route's key: the target node's key, `Self`, or the class label when it is not in the flow. */
import { isOptional, isParallel } from "./flow.js";
function routeKey(flow, declaration) {
    if (isSelf(declaration.target))
        return SELF_LABEL;
    if (isReturn(declaration.target))
        return "Return";
    if (isEnd(declaration.target))
        return "End";
    if (isOptional(declaration.target) || isParallel(declaration.target))
        return labelOf(declaration.target);
    return flow.keyOf(declaration.target) ?? labelOf(declaration.target);
}
function chooseKeys(next, flow, routerKey) {
    if (next?.kind !== "choose")
        return [];
    const step = flow.transitions.find((transition) => transition.from === routerKey)?.next;
    if (!step)
        return [];
    const parallelNames = step.parallelTargets
        ? step.parallelTargets.map((p) => p.optionName)
        : [];
    // To get the non-parallel targets, we can look at step.targets, but they include the nodes inside parallel targets.
    // Actually, let's just use the router meta! Wait, router-rules validates meta against choose.
    // If we can't easily extract it from NextDeclaration, we can add `optionNames: string[]` to NextDeclaration in chooseTargets!
    return [
        ...(step.optionNames || step.targets),
        ...parallelNames,
        ...(step.self ? [SELF_LABEL] : []),
        ...(step.return ? ["Return"] : []),
        ...(step.end ? ["End"] : []),
    ];
}
const chooseOf = (flow, routerKey) => flow.transitions.find((transition) => transition.from === routerKey)?.next;
function routesMismatch(flow, router, meta) {
    const routes = new Set(meta.routes.map((declaration) => routeKey(flow, declaration)));
    const chosen = new Set(chooseKeys(chooseOf(flow, router.key), flow, router.key));
    const missingRoutes = [...chosen].filter((key) => !routes.has(key));
    const extraRoutes = [...routes].filter((key) => !chosen.has(key));
    if (missingRoutes.length === 0 && extraRoutes.length === 0)
        return [];
    const labels = (keys) => keys.map((key) => flow.nodes.get(key)?.label ?? key);
    const parts = [
        missingRoutes.length > 0 ? `no route for ${labels(missingRoutes).join(", ")}` : "",
        extraRoutes.length > 0
            ? `routes not in its choose(...): ${labels(extraRoutes).join(", ")}`
            : "",
    ].filter((part) => part !== "");
    const message = `router ${router.label}: routes differ from choose(...) — ${parts.join("; ")}`;
    return [
        violation("router.routes-mismatch", message, [
            router.label,
            ...labels([...missingRoutes, ...extraRoutes]),
        ]),
    ];
}
/** Nodes with a transition into the node `key`. */
export const predecessorsOf = (flow, key) => flow.transitions
    .filter((transition) => targetsOf(transition).includes(key))
    .flatMap((transition) => flow.nodes.get(transition.from) ?? []);
function selfWithoutAgent(flow, router, meta) {
    const usesSelf = meta.routes.some((declaration) => isSelf(declaration.target)) ||
        chooseKeys(chooseOf(flow, router.key), flow, router.key).includes(SELF_LABEL);
    if (!usesSelf)
        return [];
    const before = predecessorsOf(flow, router.key);
    const notAgents = before.filter((ref) => ref.kind !== "agent").map((ref) => ref.label);
    if (before.length > 0 && notAgents.length === 0)
        return [];
    const why = before.length === 0 ? "nothing comes before it" : `${notAgents.join(", ")} come(s) before it`;
    const message = `router ${router.label} routes to Self, but ${why} — Self needs an agent before the router`;
    return [violation("router.self-without-agent-before", message, [router.label, ...notAgents])];
}
/** Each router's texts, its routes against its `choose(...)`, and `Self`. */
export function routerRules(flow) {
    return [...flow.nodes.values()]
        .filter((ref) => ref.kind === "router")
        .flatMap((router) => {
        const meta = routerMetaOf(router.use);
        if (meta === undefined)
            return [];
        return [
            ...textRules(router, meta),
            ...routesMismatch(flow, router, meta),
            ...selfWithoutAgent(flow, router, meta),
        ];
    });
}
