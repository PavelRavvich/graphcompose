import type { Class } from "../components/injection.js";
import type { TextAnswer } from "../dto/standard/framework.js";
import type { DtoClass } from "../dto/types.js";
import { recordNode } from "./node-kind.js";

/**
 * `@Conclusion` — where a run ends: `@Conclusion({ name, description, output: TextAnswer })`. Minimal
 * here: the answer is the last agent's text; structured conclusions come with #117.
 */
export interface ConclusionOptions {
  readonly name: string;
  readonly description: string;
  readonly output: DtoClass<TextAnswer>;
}

const conclusions = new WeakMap<Class, ConclusionOptions>();

export function Conclusion(options: ConclusionOptions) {
  return <C extends Class>(value: C): C => {
    recordNode(value, { kind: "conclusion", name: options.name });
    conclusions.set(value, options);
    return value;
  };
}

/** The options `@Conclusion` recorded on a class. */
export const conclusionMetaOf = (target: Class): ConclusionOptions | undefined =>
  conclusions.get(target);
