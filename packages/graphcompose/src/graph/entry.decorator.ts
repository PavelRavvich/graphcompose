import type { Class } from "../components/injection.js";
import type { ChatMessage } from "../dto/standard/framework.js";
import type { DtoClass } from "../dto/types.js";
import { recordNode } from "./node-kind.js";

/**
 * `@Entry` — where a run starts: `@Entry({ name, description, input: ChatMessage })`. Minimal here: a
 * chat message whose `text` becomes the task; other inputs, channels and stream come with #117.
 */
export interface EntryOptions {
  readonly name: string;
  readonly description: string;
  readonly input: DtoClass<ChatMessage>;
}

const entries = new WeakMap<Class, EntryOptions>();

export function Entry(options: EntryOptions) {
  return <C extends Class>(value: C): C => {
    recordNode(value, { kind: "entry", name: options.name });
    entries.set(value, options);
    return value;
  };
}

/** The options `@Entry` recorded on a class. */
export const entryMetaOf = (target: Class): EntryOptions | undefined => entries.get(target);
