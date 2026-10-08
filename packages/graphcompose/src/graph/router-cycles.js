import { routerMetaOf } from "./router.decorator.js";
import { predecessorsOf } from "./router-rules.js";
import { violation } from "./rule-error.js";
import { targetsOf } from "./rules.js";
/** Every step a node can take next; a router's `Self` goes back to the agents before it. */
function allEdges(flow) {
    const edges = new Map();
    for (const transition of flow.transitions) {
        const self = transition.next.kind === "choose" && transition.next.self
            ? predecessorsOf(flow, transition.from)
                .filter((ref) => ref.kind === "agent")
                .map((ref) => ref.key)
            : [];
        const targets = [...targetsOf(transition), ...self];
        edges.set(transition.from, [...(edges.get(transition.from) ?? []), ...targets]);
    }
    return edges;
}
/** The shortest way from `start` back to `start` (keys, `start` first), if the node is on a cycle. */
function cycleThrough(edges, start) {
    const cameFrom = new Map();
    const queue = [...(edges.get(start) ?? [])].map((next) => {
        cameFrom.set(next, start);
        return next;
    });
    for (let current = queue.shift(); current !== undefined; current = queue.shift()) {
        if (current === start)
            break;
        for (const next of edges.get(current) ?? []) {
            if (cameFrom.has(next))
                continue;
            cameFrom.set(next, current);
            queue.push(next);
        }
    }
    if (!cameFrom.has(start))
        return undefined;
    const path = [];
    for (let at = cameFrom.get(start); at !== undefined && at !== start; at = cameFrom.get(at)) {
        path.unshift(at);
    }
    return [start, ...path];
}
const isUnbounded = (router) => {
    const meta = routerMetaOf(router.use);
    return meta !== undefined && meta.maxVisits === undefined;
};
/** A router on a cycle must declare `maxVisits` — so the cycle ends before the run-wide steps limit. */
export function unboundedRouterCycles(flow) {
    const edges = allEdges(flow);
    const labelOf = (key) => flow.nodes.get(key)?.label ?? key;
    return [...flow.nodes.values()]
        .filter((ref) => ref.kind === "router" && isUnbounded(ref))
        .flatMap((router) => {
        const cycle = cycleThrough(edges, router.key);
        if (cycle === undefined)
            return [];
        const labels = cycle.map(labelOf);
        const shown = [...labels, router.label].join(" → ");
        const message = `${router.label} is on a cycle (${shown}) but has no maxVisits`;
        return [violation("router.unbounded-cycle", message, labels)];
    });
}
