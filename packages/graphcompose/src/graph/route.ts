import type { ChoiceTarget } from "./flow.js";

/** A text given inline (`prompt`), in files (`promptUrls`, relative to the router's file), or both. */
export interface PromptSource {
  readonly prompt?: string;
  readonly promptUrls?: readonly string[];
}

/** What one choice of a router means: `route(CoderAgent, "Writing the code")`. */
export interface RouteDeclaration {
  readonly target: ChoiceTarget;
  readonly text: string | PromptSource;
}

/** One of a router's routes: its target (a node or `Self`) and what choosing it means. */
export function route(target: ChoiceTarget, text: string | PromptSource): RouteDeclaration {
  return { target, text };
}

/** The option name a router sees for `Self`. */
export const SELF_OPTION = "self";
