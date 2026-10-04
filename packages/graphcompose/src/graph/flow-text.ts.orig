import {
  isSelf,
  labelOf,
  type ChoiceTarget,
  type Flow,
  type FlowNode,
  type FlowStep,
} from "./flow.js";
import { collectFlow, type CollectedFlow } from "./flow-nodes.js";
import type { NodeKind } from "./node-kind.js";

/** How a node's kind reads after its name; working nodes go by name alone. */
const KIND_TEXT: Readonly<Record<NodeKind, string>> = {
  "workflow-start": " (workflow start)",
  "workflow-finish": " (workflow finish)",
  agent: "",
  router: "",
};

function nodeText(collected: CollectedFlow, target: FlowNode): string {
  const key = collected.keyOf(target);
  const ref = key === undefined ? undefined : collected.nodes.get(key);
  return ref === undefined ? labelOf(target) : `${ref.name}${KIND_TEXT[ref.kind]}`;
}

const nameIn =
  (collected: CollectedFlow) =>
  (target: ChoiceTarget): string =>
    isSelf(target) ? "Self" : nodeText(collected, target);

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
 * The flow as text, one line per declared step, nodes by name, starts and finishes marked:
 * `chat (workflow start) → main`, `main → profiler | scout | chat (workflow finish)` (a choice),
 * `coder → reviewer → review-gate` (a chain).
 */
export function flowLines(flow: Flow): string[] {
  const name = nameIn(collectFlow(flow));
  return flow.map((step) => stepLine(step, name));
}
