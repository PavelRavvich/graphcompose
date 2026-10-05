import type { ChoiceTarget } from "./flow.js";
import type { PromptInput } from "../components/prompt-input.js";
import { file } from "../components/file.js";

/** What one choice of a router means, linking a target to its text condition. */
export interface RouteDeclaration {
  readonly target: ChoiceTarget;
  readonly condition: PromptInput;
}

/** The option name a router sees for `Self`. */
export const SELF_OPTION = "self";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const route = (condition: PromptInput) => ({
  to: (target: ChoiceTarget): RouteDeclaration => ({ target, condition }),
});

route.file = (path: string) => route(file(path));
