import { recordNode } from "./node-kind.js";
const starts = new WeakMap();
export function WorkflowStart(options) {
    return (value) => {
        recordNode(value, { kind: "workflow-start", name: options.name });
        starts.set(value, options);
        return value;
    };
}
/** The options `@WorkflowStart` recorded on a class. */
export const workflowStartMetaOf = (target) => starts.get(target);
