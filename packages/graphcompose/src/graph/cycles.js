import { violation } from "./rule-error.js";
import { targetsOf } from "./rules.js";
/** Edges between non-router nodes: a cycle left in this graph does not pass through a router. */
function edgesWithoutRouters(flow) {
    const isRouter = (name) => flow.nodes.get(name)?.kind === "router";
    const edges = new Map();
    for (const transition of flow.transitions) {
        if (isRouter(transition.from))
            continue;
        const targets = targetsOf(transition).filter((target) => !isRouter(target));
        edges.set(transition.from, [...(edges.get(transition.from) ?? []), ...targets]);
    }
    return edges;
}
const lowest = (search, name, candidate) => {
    search.lowOf.set(name, Math.min(search.lowOf.get(name) ?? candidate, candidate));
};
function popComponent(search, root) {
    const component = [];
    for (let top = search.stack.pop(); top !== undefined; top = search.stack.pop()) {
        component.push(top);
        if (top === root)
            break;
    }
    return component;
}
/** Tarjan's strongly connected components (recursive; flows are small). */
function connect(edges, search, name) {
    search.indexOf.set(name, search.index);
    search.lowOf.set(name, search.index);
    search.index += 1;
    search.stack.push(name);
    for (const target of edges.get(name) ?? []) {
        const seen = search.indexOf.get(target);
        if (seen === undefined) {
            connect(edges, search, target);
            lowest(search, name, search.lowOf.get(target) ?? Number.POSITIVE_INFINITY);
        }
        else if (search.stack.includes(target)) {
            lowest(search, name, seen);
        }
    }
    if (search.lowOf.get(name) === search.indexOf.get(name)) {
        search.components.push(popComponent(search, name));
    }
}
const isCycle = (edges, component) => {
    const [only] = component;
    if (component.length > 1)
        return true;
    return only !== undefined && (edges.get(only) ?? []).includes(only);
};
/** Every cycle must pass through a router — otherwise nothing can ever leave it. */
export function cyclesWithoutRouter(flow) {
    const edges = edgesWithoutRouters(flow);
    const search = {
        index: 0,
        indexOf: new Map(),
        lowOf: new Map(),
        stack: [],
        components: [],
    };
    for (const name of edges.keys()) {
        if (!search.indexOf.has(name))
            connect(edges, search, name);
    }
    return search.components
        .filter((component) => isCycle(edges, component))
        .map((component) => {
        const labels = component.reverse().map((name) => flow.nodes.get(name)?.label ?? name);
        const message = `cycle without a router: ${labels.join(" → ")}`;
        return violation("graph.cycle-without-router", message, labels);
    });
}
