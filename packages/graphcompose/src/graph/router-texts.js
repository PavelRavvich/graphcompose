import { ComponentError } from "../components/metadata.js";
import { isSelf, isReturn, isEnd, labelOf, isOptional, isParallel } from "./flow.js";
import { SELF_OPTION } from "./route.js";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { routerMetaOf } from "./router.decorator.js";
import { renderPromptVariables } from "../components/prompt-render.js";
function optionOf(model, declaration) {
    if (isSelf(declaration.target))
        return { option: SELF_OPTION, optionalBranches: [] };
    if (isReturn(declaration.target))
        return { option: "Return", optionalBranches: [] };
    if (isEnd(declaration.target))
        return { option: "End", optionalBranches: [] };
    const getLabel = (t) => model.collected.keyOf(t) ?? labelOf(t);
    const optionalBranches = [];
    const walk = (t) => {
        if (isOptional(t)) {
            optionalBranches.push(getLabel(t.target));
            walk(t.target);
        }
        else if (isParallel(t)) {
            t.targets.forEach(walk);
        }
    };
    walk(declaration.target);
    return { option: getLabel(declaration.target), optionalBranches };
}
const byOption = (left, right) => left.option < right.option ? -1 : left.option > right.option ? 1 : 0;
function loadRouter(model, ref) {
    const meta = routerMetaOf(ref.use);
    if (meta === undefined)
        throw new ComponentError(`${ref.label} is not a @Router component`);
    const routes = meta.routes.map((declaration) => ({
        ...optionOf(model, declaration),
        condition: renderPromptVariables(ref.name, declaration, meta.source, undefined),
    }));
    return {
        name: ref.name,
        description: meta.description,
        model: meta.model,
        ...(meta.maxVisits === undefined ? {} : { maxVisits: meta.maxVisits }),
        instructions: renderPromptVariables(ref.name, meta, meta.source, undefined),
        routes: [...routes].sort(byOption),
    };
}
/** Every router of the flow with its texts loaded, by node key. */
// eslint-disable-next-line @typescript-eslint/require-await
export async function loadRouters(model) {
    const routers = [...model.nodes.values()].filter((ref) => ref.kind === "router");
    const loaded = routers.map((ref) => loadRouter(model, ref));
    return new Map(loaded.map((router) => [router.name, router]));
}
