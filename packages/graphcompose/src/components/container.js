import { InjectionToken, tokenName } from "./injection.js";
import { ComponentError, componentOf } from "./metadata.js";
const depsOf = (cls) => {
    const meta = componentOf(cls);
    if (meta?.kind === "tool" ||
        meta?.kind === "mcp-tool" ||
        meta?.kind === "injectable" ||
        meta?.kind === "rag")
        return meta.meta.deps;
    return [];
};
function registrations(providers, core) {
    const registered = new Map();
    for (const [token, value] of core)
        registered.set(token, { kind: "value", value });
    for (const provider of providers) {
        if ("provide" in provider)
            registered.set(provider.provide, { kind: "value", value: provider.useValue });
        else
            registered.set(provider, { kind: "class", cls: provider });
    }
    return registered;
}
/** A class's dependencies as a readable tree: `JobFitJudge (ROUTER_FACTORY), JOB_SEARCH`. */
export function dependencyTree(cls, providers) {
    const classes = new Map(providers.flatMap((p) => ("provide" in p ? [] : [[p, p]])));
    const render = (deps) => deps
        .map((dep) => {
        const provided = classes.get(dep);
        const inner = provided === undefined ? [] : depsOf(provided);
        return inner.length === 0 ? tokenName(dep) : `${tokenName(dep)} (${render(inner)})`;
    })
        .join(", ");
    return render(depsOf(cls));
}
/**
 * Checks the dependency graph of `roots` without creating anything: every dependency registered,
 * no cycles. Errors name the component and the chain.
 */
export function checkGraph(roots, providers, core) {
    const registered = registrations(providers, new Map(core.map((t) => [t, undefined])));
    const done = new Set();
    const visit = (cls, chain) => {
        if (done.has(cls))
            return;
        const path = [...chain, tokenName(cls)];
        if (chain.includes(tokenName(cls)))
            throw new ComponentError(`Dependency cycle: ${path.join(" → ")}`);
        for (const dep of depsOf(cls)) {
            const reg = registered.get(dep);
            if (reg === undefined) {
                throw new ComponentError(`${tokenName(cls)}: "${tokenName(dep)}" is not registered in @Workflow({ providers })`);
            }
            if (reg.kind === "class")
                visit(reg.cls, path);
        }
        done.add(cls);
    };
    roots.forEach((root) => {
        visit(root, []);
    });
}
/** Creates components once (singletons), dependencies first; `created` records the order. */
export function createContainer(providers, core, options = {}) {
    const registered = registrations(providers, core);
    for (const [token, value] of options.overrides ?? []) {
        registered.set(token, { kind: "value", value });
    }
    const instances = new Map();
    const created = [];
    const resolve = (token) => {
        if (instances.has(token))
            return instances.get(token);
        const reg = registered.get(token);
        if (reg === undefined && token instanceof InjectionToken) {
            throw new ComponentError(`"${tokenName(token)}" is not registered in @Workflow({ providers })`);
        }
        const value = reg?.kind === "value"
            ? reg.value
            : instantiate(reg?.kind === "class" ? reg.cls : token);
        instances.set(token, value);
        return value;
    };
    const instantiate = (cls) => {
        const args = depsOf(cls).map(resolve);
        const instance = new cls(...args);
        created.push(tokenName(cls));
        options.onCreate?.(instance);
        return instance;
    };
    return { get: (token) => resolve(token), created };
}
