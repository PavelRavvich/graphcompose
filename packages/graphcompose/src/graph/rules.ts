import { labelOf, type Flow } from "./flow.js";
import type { CollectedFlow, FlowNodeRef, Transition } from "./flow-nodes.js";
import { violation, type RuleViolation } from "./rule-error.js";

/** Every node's declared next steps (normally one). */
export function nextStepsByNode(transitions: readonly Transition[]): Map<string, Transition[]> {
  const byNode = new Map<string, Transition[]>();
  for (const transition of transitions) {
    byNode.set(transition.from, [...(byNode.get(transition.from) ?? []), transition]);
  }
  return byNode;
}

/** Targets a transition can lead to (`Self` excluded: it goes back to a predecessor). */
export const targetsOf = (transition: Transition): readonly string[] =>
  transition.next.kind === "to" ? [transition.next.target] : transition.next.targets;

const labelIn = (flow: CollectedFlow, name: string): string => flow.nodes.get(name)?.label ?? name;

function twoNextSteps(flow: CollectedFlow): RuleViolation[] {
  return [...nextStepsByNode(flow.transitions)]
    .filter(([, steps]) => steps.length > 1)
    .map(([name]) => {
      const label = labelIn(flow, name);
      const message = `${label} has more than one next step — one \`to\` or one \`choose\``;
      return violation("graph.two-next-steps", message, [label]);
    });
}

function chooseFromNonRouter(flow: CollectedFlow): RuleViolation[] {
  return flow.transitions
    .filter((t) => t.next.kind === "choose" && flow.nodes.get(t.from)?.kind !== "router")
    .map((t) => {
      const label = labelIn(flow, t.from);
      return violation("graph.choose-from-non-router", `${label} is not a router`, [label]);
    });
}

function routerNotLastInChain(raw: Flow, flow: CollectedFlow): RuleViolation[] {
  return raw.flatMap((step) =>
    step.kind !== "chain"
      ? []
      : step.nodes.slice(0, -1).flatMap((member) => {
          const name = flow.nameOf(member);
          if (name === undefined || flow.nodes.get(name)?.kind !== "router") return [];
          const message = `router ${labelOf(member)} is in the middle of a chain — a router only ends a chain`;
          return [violation("graph.router-not-last-in-chain", message, [labelOf(member)])];
        }),
  );
}

function entries(flow: CollectedFlow): readonly FlowNodeRef[] {
  return [...flow.nodes.values()].filter((ref) => ref.kind === "entry");
}

function noEntry(flow: CollectedFlow): RuleViolation[] {
  if (flow.nodes.size === 0 || entries(flow).length > 0) return [];
  return [violation("graph.no-entry", "the flow has no entry (@Entry)", [])];
}

function reachableFromEntries(flow: CollectedFlow): Set<string> {
  const next = nextStepsByNode(flow.transitions);
  const seen = new Set<string>();
  const queue = entries(flow).map((ref) => ref.name);
  for (let current = queue.shift(); current !== undefined; current = queue.shift()) {
    if (seen.has(current)) continue;
    seen.add(current);
    queue.push(...(next.get(current) ?? []).flatMap(targetsOf));
  }
  return seen;
}

function unreachable(flow: CollectedFlow): RuleViolation[] {
  if (entries(flow).length === 0) return [];
  const reached = reachableFromEntries(flow);
  return [...flow.nodes.values()]
    .filter((ref) => !reached.has(ref.name))
    .map((ref) =>
      violation("graph.unreachable-node", `${ref.label} cannot be reached from an entry`, [
        ref.label,
      ]),
    );
}

function deadEnds(flow: CollectedFlow): RuleViolation[] {
  const next = nextStepsByNode(flow.transitions);
  return [...flow.nodes.values()].flatMap((ref) => {
    const hasNext = next.has(ref.name);
    if (ref.kind === "conclusion" && hasNext) {
      const message = `conclusion ${ref.label} has a next step — a conclusion ends the run`;
      return [violation("graph.next-after-conclusion", message, [ref.label])];
    }
    if (ref.kind === "conclusion" || hasNext) return [];
    const message = `${ref.label} has no next step and is not a conclusion`;
    return [violation("graph.dead-end", message, [ref.label])];
  });
}

/** Node-to-node rules: next steps, chains, entries, reachability, dead ends. */
export function graphRules(raw: Flow, flow: CollectedFlow): RuleViolation[] {
  return [
    ...twoNextSteps(flow),
    ...chooseFromNonRouter(flow),
    ...routerNotLastInChain(raw, flow),
    ...noEntry(flow),
    ...unreachable(flow),
    ...deadEnds(flow),
  ];
}
