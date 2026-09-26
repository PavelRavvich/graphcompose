import { InjectionToken, tokenName, type Class, type Provider, type Token } from "./injection.js";
import { ComponentError, componentOf } from "./metadata.js";

const depsOf = (cls: Class): readonly Token[] => {
  const meta = componentOf(cls);
  if (
    meta?.kind === "tool" ||
    meta?.kind === "mcp-tool" ||
    meta?.kind === "injectable" ||
    meta?.kind === "rag"
  )
    return meta.meta.deps;
  return [];
};

type Registration =
  | { readonly kind: "value"; readonly value: unknown }
  | { readonly kind: "class"; readonly cls: Class };

function registrations(
  providers: readonly Provider[],
  core: ReadonlyMap<Token, unknown>,
): Map<Token, Registration> {
  const registered = new Map<Token, Registration>();
  for (const [token, value] of core) registered.set(token, { kind: "value", value });
  for (const provider of providers) {
    if ("provide" in provider)
      registered.set(provider.provide, { kind: "value", value: provider.useValue });
    else registered.set(provider, { kind: "class", cls: provider });
  }
  return registered;
}

/** A class's dependencies as a readable tree: `JobFitJudge (ROUTER_FACTORY), JOB_SEARCH`. */
export function dependencyTree(cls: Class, providers: readonly Provider[]): string {
  const classes = new Map(
    providers.flatMap((p) => ("provide" in p ? [] : [[p as Token, p] as const])),
  );
  const render = (deps: readonly Token[]): string =>
    deps
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
export function checkGraph(
  roots: readonly Class[],
  providers: readonly Provider[],
  core: readonly Token[],
): void {
  const registered = registrations(providers, new Map(core.map((t) => [t, undefined])));
  const done = new Set<Token>();
  const visit = (cls: Class, chain: readonly string[]): void => {
    if (done.has(cls)) return;
    const path = [...chain, tokenName(cls)];
    if (chain.includes(tokenName(cls)))
      throw new ComponentError(`Dependency cycle: ${path.join(" → ")}`);
    for (const dep of depsOf(cls)) {
      const reg = registered.get(dep);
      if (reg === undefined) {
        throw new ComponentError(
          `${tokenName(cls)}: "${tokenName(dep)}" is not registered in @Workflow({ providers })`,
        );
      }
      if (reg.kind === "class") visit(reg.cls, path);
    }
    done.add(cls);
  };
  roots.forEach((root) => {
    visit(root, []);
  });
}

export interface Container {
  readonly get: (token: Token) => unknown;
  /** Class names in creation order (dependencies before dependants). */
  readonly created: readonly string[];
}

/** Creates components once (singletons), dependencies first; `created` records the order. */
export function createContainer(
  providers: readonly Provider[],
  core: ReadonlyMap<Token, unknown>,
): Container {
  const registered = registrations(providers, core);
  const instances = new Map<Token, unknown>();
  const created: string[] = [];
  const resolve = (token: Token): unknown => {
    if (instances.has(token)) return instances.get(token);
    const reg = registered.get(token);
    if (reg === undefined && token instanceof InjectionToken) {
      throw new ComponentError(
        `"${tokenName(token)}" is not registered in @Workflow({ providers })`,
      );
    }
    const value =
      reg?.kind === "value"
        ? reg.value
        : instantiate(reg?.kind === "class" ? reg.cls : (token as Class));
    instances.set(token, value);
    return value;
  };
  const instantiate = (cls: Class): unknown => {
    const args = depsOf(cls).map(resolve);
    const instance: unknown = new (cls as unknown as new (...a: unknown[]) => unknown)(...args);
    created.push(tokenName(cls));
    return instance;
  };
  return { get: (token: Token): unknown => resolve(token), created };
}
