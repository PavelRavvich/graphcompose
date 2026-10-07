/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { isSelf, isReturn, isEnd, unwrapTarget, labelOf, } from "./flow.js";
import { collectFlow } from "./flow-nodes.js";
/** How a node's kind reads after its name; working nodes go by name alone. */
const KIND_TEXT = {
    "workflow-start": " (workflow start)",
    "workflow-finish": " (workflow finish)",
    agent: "",
    action: " (action)",
    router: "",
};
function nodeText(collected, target) {
    const key = collected.keyOf(target);
    const ref = key === undefined ? undefined : collected.nodes.get(key);
    return ref === undefined ? labelOf(target) : `${ref.name}${KIND_TEXT[ref.kind]}`;
}
const nameIn = (collected) => (target) => isSelf(target)
    ? "Self"
    : isReturn(target)
        ? "Return"
        : isEnd(target)
            ? "Skip"
            : target.kind === "parallel" || target.kind === "optional"
                ? target.kind
                : nodeText(collected, target);
function stepLine(step, name) {
    switch (step.kind) {
        case "to":
            return `${step.from.map(name).join(", ")} → ${step.targets.map((t) => name(unwrapTarget(t))).join(", ")}`;
        case "batchParallel":
            return `${step.from.map(name).join(", ")} ⇉ [batchParallel] ${name(step.target)}`;
        case "choose":
            return `${step.from.map(name).join(", ")} → ${step.targets.map(name).join(" | ")}`;
        case "chain":
            return step.nodes.map(name).join(" → ");
        case "join":
            return `${step.from.map(name).join(", ")} → join(${name(step.target)})`;
        case "joinAny":
            return `${step.from.map(name).join(", ")} → joinAny(${name(step.target)})`;
        case "joinQuorum":
            return `${step.from.map(name).join(", ")} → joinQuorum(${step.count}, ${name(step.target)})`;
    }
}
/**
 * The flow as text, one line per declared step, nodes by name, starts and finishes marked:
 * `chat (workflow start) → main`, `main → profiler | scout | chat (workflow finish)` (a choice),
 * `coder → reviewer → review-gate` (a chain).
 */
export function flowLines(flow) {
    const name = nameIn(collectFlow(flow));
    return flow.map((step) => stepLine(step, name));
}
