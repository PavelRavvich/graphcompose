import { componentOf } from "../components/metadata.js";
const nodes = new WeakMap();
/** Called by node decorators (`@Router`, and `@WorkflowStart` / `@WorkflowFinish`): marks a class as a flow node. */
export function recordNode(target, info) {
    nodes.set(target, info);
}
/** A flow node's kind and name; `@Agent` classes are nodes too. Undefined for anything else. */
export function nodeInfoOf(target) {
    const recorded = nodes.get(target);
    if (recorded !== undefined)
        return recorded;
    const component = componentOf(target);
    if (component?.kind === "agent")
        return { kind: "agent", name: component.meta.name };
    // Note: workflow meta has name inside meta.meta? Wait, componentOf(target).meta is WorkflowMeta! So component.meta.name
    if (component?.kind === "action")
        return { kind: "action", name: component.meta.name };
    if (component?.kind === "workflow")
        return { kind: "workflow", name: component.meta.name };
    return undefined;
}
export const isWorkingKind = (kind) => kind === "agent" || kind === "router" || kind === "action" || kind === "workflow";
