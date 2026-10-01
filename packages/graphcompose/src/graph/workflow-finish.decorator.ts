import type { Class } from "../components/injection.js";
import type { WorkflowFinishText } from "../dto/standard/framework.js";
import type { DtoClass } from "../dto/types.js";
import { recordNode } from "./node-kind.js";

/**
 * `@WorkflowFinish` — where a workflow run finishes: `@WorkflowFinish({ name, description, output:
 * WorkflowFinishText })`. Minimal here: the output is the last agent's text; structured finishes come
 * with #117.
 */
export interface WorkflowFinishOptions {
  readonly name: string;
  readonly description: string;
  readonly output: DtoClass<WorkflowFinishText>;
}

const finishes = new WeakMap<Class, WorkflowFinishOptions>();

export function WorkflowFinish(options: WorkflowFinishOptions) {
  return <C extends Class>(value: C): C => {
    recordNode(value, { kind: "workflow-finish", name: options.name });
    finishes.set(value, options);
    return value;
  };
}

/** The options `@WorkflowFinish` recorded on a class. */
export const workflowFinishMetaOf = (target: Class): WorkflowFinishOptions | undefined =>
  finishes.get(target);
