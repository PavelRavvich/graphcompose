import { isSelf, labelOf, type ChoiceTarget, type Flow, type FlowStep } from "./flow.js";
import { collectFlow, type CollectedFlow } from "./flow-nodes.js";

const nameIn =
  (collected: CollectedFlow) =>
  (target: ChoiceTarget): string =>
    isSelf(target) ? "Self" : (collected.nameOf(target) ?? labelOf(target));

function stepLine(step: FlowStep, name: (target: ChoiceTarget) => string): string {
  switch (step.kind) {
    case "to":
      return `${step.from.map(name).join(", ")} → ${name(step.to)}`;
    case "choose":
      return `${step.from.map(name).join(", ")} → ${step.targets.map(name).join(" | ")}`;
    case "chain":
      return step.nodes.map(name).join(" → ");
  }
}

/**
 * The flow as text, one line per declared step, nodes by name: `chat-message → main`,
 * `main → profiler | scout | answer` (a choice), `coder → reviewer → review-gate` (a chain).
 */
export function flowLines(flow: Flow): string[] {
  const name = nameIn(collectFlow(flow));
  return flow.map((step) => stepLine(step, name));
}
