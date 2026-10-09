/** A named value to inject (config objects, functions); classes are their own tokens. */
export class InjectionToken {
  description;
  constructor(description) {
    this.description = description;
  }
}
export const tokenName = (token) =>
  token instanceof InjectionToken ? token.description : token.name || "(anonymous class)";
