import type { Class } from "../components/injection.js";
import {
  isNamedNode,
  isSelf,
  labelOf,
  type ChoiceTarget,
  type Flow,
  type FlowNode,
  type FlowStep,
} from "./flow.js";
import { nodeInfoOf, type NodeKind } from "./node-kind.js";
import { violation, type RuleViolation } from "./rule-error.js";

/** One node of the assembled flow; `name` is the graph node's name. */
export interface FlowNodeRef {
  readonly name: string;
  readonly kind: NodeKind;
  readonly use: Class;
  readonly label: string;
}

/** A node's declared next step: one unconditional target, or a router's choice. */
export type NextDeclaration =
  | { readonly kind: "to"; readonly target: string }
  | { readonly kind: "choose"; readonly targets: readonly string[]; readonly self: boolean };

/** A declared next step of one node. */
export interface Transition {
  readonly from: string;
  readonly next: NextDeclaration;
}

/** Nodes, transitions and node-level violations of a flow. */
export interface CollectedFlow {
  readonly nodes: ReadonlyMap<string, FlowNodeRef>;
  readonly transitions: readonly Transition[];
  readonly violations: readonly RuleViolation[];
  /** The node name of a class or named node, if it is a node of this flow. */
  readonly nameOf: (target: FlowNode) => string | undefined;
}

type Identity = Class | FlowNode;

function duplicateViolation(taken: Identity, target: FlowNode, name: string): RuleViolation {
  const both = [labelOf(taken), labelOf(target)];
  return isNamedNode(taken) && isNamedNode(target)
    ? violation("graph.duplicate-node-name", `node name "${name}" is declared twice`, both)
    : violation("graph.duplicate-node", `two nodes are named "${name}": ${both.join(", ")}`, both);
}

/** Resolves every class / named node of the flow to a node once; records node-level violations. */
function createResolver() {
  const nodes = new Map<string, FlowNodeRef>();
  const owners = new Map<string, Identity>();
  const resolved = new Map<Identity, string | undefined>();
  const violations: RuleViolation[] = [];

  const register = (target: FlowNode): string | undefined => {
    const use = isNamedNode(target) ? target.use : target;
    const info = nodeInfoOf(use);
    if (info === undefined) {
      const message = `${labelOf(target)} is not a flow node (@Entry, @Router, @Agent or @Conclusion)`;
      violations.push(violation("graph.not-a-node", message, [labelOf(target)]));
      return undefined;
    }
    const name = isNamedNode(target) ? target.name : info.name;
    const taken = owners.get(name);
    if (taken !== undefined) {
      // reported once; the duplicate stands for the same node, so no follow-up violations
      violations.push(duplicateViolation(taken, target, name));
      return name;
    }
    owners.set(name, target);
    nodes.set(name, { name, kind: info.kind, use, label: labelOf(target) });
    return name;
  };

  const resolve = (target: FlowNode): string | undefined => {
    if (!resolved.has(target)) resolved.set(target, register(target));
    return resolved.get(target);
  };

  const lookup = (target: FlowNode): string | undefined => resolved.get(target);

  return { nodes, violations, resolve, lookup };
}

type Resolve = (target: FlowNode) => string | undefined;

const defined = (names: readonly (string | undefined)[]): string[] =>
  names.filter((name): name is string => name !== undefined);

function chooseTargets(targets: readonly ChoiceTarget[], resolve: Resolve): NextDeclaration {
  const nodesOnly = targets.filter((target): target is FlowNode => !isSelf(target));
  return {
    kind: "choose",
    targets: defined(nodesOnly.map(resolve)),
    self: targets.some(isSelf),
  };
}

function transitionsOf(step: FlowStep, resolve: Resolve): Transition[] {
  switch (step.kind) {
    case "to": {
      const sources = defined(step.from.map(resolve));
      const target = resolve(step.to);
      return target === undefined
        ? []
        : sources.map((from) => ({ from, next: { kind: "to", target } }));
    }
    case "choose": {
      const sources = defined(step.from.map(resolve));
      const next = chooseTargets(step.targets, resolve);
      return sources.map((from) => ({ from, next }));
    }
    case "chain":
      return step.nodes.slice(1).flatMap((to, index) => {
        const source = step.nodes[index];
        return source === undefined
          ? []
          : transitionsOf({ kind: "to", from: [source], to }, resolve);
      });
  }
}

/** Every node and transition of the flow, in declaration order. */
export function collectFlow(flow: Flow): CollectedFlow {
  const resolver = createResolver();
  const transitions = flow.flatMap((step) => transitionsOf(step, resolver.resolve));
  return {
    nodes: resolver.nodes,
    transitions,
    violations: resolver.violations,
    nameOf: resolver.lookup,
  };
}
