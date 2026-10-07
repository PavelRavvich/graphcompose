/* eslint-disable @typescript-eslint/restrict-template-expressions */

import {
  isSelf,
  isReturn,
  isEnd,
  unwrapTarget,
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
  action: " (action)",
  router: "",
  quorumRouter: "",
};

function nodeText(collected: CollectedFlow, target: FlowNode): string {
  const key = collected.keyOf(target);
  const ref = key === undefined ? undefined : collected.nodes.get(key);
  return ref === undefined ? labelOf(target) : `${ref.name}${KIND_TEXT[ref.kind]}`;
}

const nameIn =
  (collected: CollectedFlow) =>
  (target: ChoiceTarget): string =>
    isSelf(target)
      ? "Self"
      : isReturn(target)
        ? "Return"
        : isEnd(target)
          ? "Skip"
          : (target as any).kind === "parallel" || (target as any).kind === "optional"
            ? (target as any).kind
            : nodeText(collected, target as any);

function stepLine(step: FlowStep, name: (target: ChoiceTarget) => string): string {
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
export function flowLines(flow: Flow): string[] {
  const name = nameIn(collectFlow(flow));
  return flow.map((step) => stepLine(step, name));
}
