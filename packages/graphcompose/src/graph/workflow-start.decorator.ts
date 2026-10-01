import type { Class } from "../components/injection.js";
import type { WorkflowStartText } from "../dto/standard/framework.js";
import type { DtoClass } from "../dto/types.js";
import { recordNode } from "./node-kind.js";

/**
 * `@WorkflowStart` — where a workflow run starts: `@WorkflowStart({ name, description, input:
 * WorkflowStartText })`. Minimal here: the input's `text` becomes the task; other inputs, channels and
 * stream come with #117.
 */
export interface WorkflowStartOptions {
  readonly name: string;
  readonly description: string;
  readonly input: DtoClass<WorkflowStartText>;
}

const starts = new WeakMap<Class, WorkflowStartOptions>();

export function WorkflowStart(options: WorkflowStartOptions) {
  return <C extends Class>(value: C): C => {
    recordNode(value, { kind: "workflow-start", name: options.name });
    starts.set(value, options);
    return value;
  };
}

/** The options `@WorkflowStart` recorded on a class. */
export const workflowStartMetaOf = (target: Class): WorkflowStartOptions | undefined =>
  starts.get(target);
