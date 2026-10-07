import { recordNode } from "./node-kind.js";
const finishes = new WeakMap();
export function WorkflowFinish(options) {
    return (value) => {
        recordNode(value, { kind: "workflow-finish", name: options.name });
        finishes.set(value, options);
        return value;
    };
}
/** The options `@WorkflowFinish` recorded on a class. */
export const workflowFinishMetaOf = (target) => finishes.get(target);
