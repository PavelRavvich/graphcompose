/** A named value to inject (config objects, functions); classes are their own tokens. */
export class InjectionToken<T> {
  declare readonly __type: T;
  constructor(readonly description: string) {}
}

/** Any class. `never[]` parameters: we only need the instance type. */
export type Class<T = unknown> = abstract new (...args: never[]) => T;

export type Token = Class | InjectionToken<unknown>;

/** What a token gives the constructor: a token's value type, or a class's instance type. */
export type Resolved<T> =
  T extends InjectionToken<infer V>
    ? V
    : T extends abstract new (...args: never[]) => infer I
      ? I
      : never;

/** Constructor parameters for a `deps` list — the compiler checks count, order and types. */
export type ResolvedAll<D extends readonly Token[]> = { -readonly [K in keyof D]: Resolved<D[K]> };

export const tokenName = (token: Token): string =>
  token instanceof InjectionToken ? token.description : token.name || "(anonymous class)";

/** Registered in `@Bundle({ providers })`: a class (created by the container) or a value. */
export type Provider = Class | { readonly provide: Token; readonly useValue: unknown };
