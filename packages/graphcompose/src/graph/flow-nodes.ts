/* eslint-disable complexity, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { Class } from "../components/injection.js";
import {
  isNamedNode,
  isSelf,
  isReturn,
  isEnd,
  isParallel,
  isOptional,
  unwrapTarget,
  labelOf,
  type ChoiceTarget,
  type Flow,
  type FlowNode,
  type FlowStep,
} from "./flow.js";
import { nodeInfoOf, type NodeKind } from "./node-kind.js";
import { violation, type RuleViolation } from "./rule-error.js";

/**
 * A node's key in the flow — unique among its nodes. It is the node's name, except for a workflow
 * start: starts are never a step's target, so they have names of their own (`workflow-start.<name>`)
 * and a start and a finish may share a name (`chat` / `chat`).
 */
const flowKeyOf = (kind: NodeKind, name: string): string =>
  kind === "workflow-start" ? `${kind}.${name}` : name;

/** One node of the assembled flow: its key in the flow and its name (the declared one). */
export interface FlowNodeRef {
  readonly key: string;
  readonly name: string;
  readonly kind: NodeKind;
  readonly use: Class;
  readonly label: string;
}

/** A node's declared next step: one unconditional target, or a router's choice. */
export type NextDeclaration =
  | { readonly kind: "to"; readonly targets: readonly string[] }
  | { readonly kind: "nextEach"; readonly target: string }
  | {
      readonly kind: "choose";
      readonly targets: readonly string[];
      readonly parallelTargets: readonly { optionName: string; targets: string[] }[];
      readonly self: boolean;
      readonly skip: boolean;
    }
  | { readonly kind: "join"; readonly target: string; readonly joinSources: readonly string[] }
  | { readonly kind: "joinAny"; readonly target: string; readonly joinSources: readonly string[] }
  | {
      readonly kind: "joinQuorum";
      readonly target: string;
      readonly joinSources: readonly string[];
      readonly count: number;
    };

/** A declared next step of one node (both ends are node keys). */
export interface Transition {
  readonly from: string;
  readonly next: NextDeclaration;
}

/** Nodes (by key), transitions and node-level violations of a flow. */
export interface CollectedFlow {
  readonly nodes: ReadonlyMap<string, FlowNodeRef>;
  readonly transitions: readonly Transition[];
  readonly violations: readonly RuleViolation[];
  /** The node key of a class or named node, if it is a node of this flow. */
  readonly keyOf: (target: FlowNode) => string | undefined;
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
      const message = `${labelOf(target)} is not a flow node (@WorkflowStart, @Router, @Agent or @WorkflowFinish)`;
      violations.push(violation("graph.not-a-node", message, [labelOf(target)]));
      return undefined;
    }
    const name = isNamedNode(target) ? target.name : info.name;
    const key = flowKeyOf(info.kind, name);
    const taken = owners.get(key);
    if (taken !== undefined) {
      // reported once; the duplicate stands for the same node, so no follow-up violations
      violations.push(duplicateViolation(taken, target, name));
      return key;
    }
    owners.set(key, target);
    nodes.set(key, { key, name, kind: info.kind, use, label: labelOf(target) });
    return key;
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
  const nodesOnly: FlowNode[] = [];
  const parallelTargets: { optionName: string; targets: string[] }[] = [];
  const optionNames: string[] = [];
  let hasSelf = false;
  let hasReturn = false;
  let hasEnd = false;

  const extract = (t: ChoiceTarget) => {
    if (isSelf(t)) hasSelf = true;
    else if (isReturn(t)) hasReturn = true;
    else if (isEnd(t)) hasEnd = true;
    else if ((t as any).kind === "parallel") {
      const pTargets = (t as any).targets.map((inner: any) => {
        if (isSelf(inner) || isReturn(inner) || isEnd(inner) || inner.kind === "parallel")
          throw new Error("Invalid parallel target");
        let actual = inner;
        if (inner.kind === "optional") actual = inner.target;
        nodesOnly.push(actual as FlowNode);
        return resolve(actual as FlowNode);
      });
      parallelTargets.push({ optionName: labelOf(t), targets: defined(pTargets) });
    } else if ((t as any).kind === "optional") {
      extract((t as any).target);
    } else {
      nodesOnly.push(t as FlowNode);
      const res = resolve(t as FlowNode);
      if (res) optionNames.push(res);
    }
  };

  targets.forEach(extract);

  return {
    kind: "choose",
    targets: defined(nodesOnly.map(resolve)),
    parallelTargets,
    optionNames,
    self: hasSelf,
    return: hasReturn,
    end: hasEnd,
  } as any;
}

function transitionsOf(step: FlowStep, resolve: Resolve): Transition[] {
  switch (step.kind) {
    case "to": {
      const sources = defined(step.from.map(resolve));
      const targets = defined(step.targets.map((t) => resolve(unwrapTarget(t))));
      return targets.length === 0
        ? []
        : sources.map((from) => ({ from, next: { kind: "to", targets } }));
    }
    case "choose": {
      const sources = defined(step.from.map(resolve));
      const next = chooseTargets(step.targets, resolve);
      return sources.map((from) => ({ from, next }));
    }

    case "nextEach": {
      const sources = defined(step.from.map(resolve));
      const target = resolve(step.target);
      return target === undefined
        ? []
        : sources.map((from) => ({
            from,
            next: { kind: "nextEach", target, extractor: step.extractor },
          }));
    }
    case "joinAny":
    case "joinQuorum":
    case "join": {
      const sources = defined(step.from.map(resolve));
      const target = resolve(step.target);
      return target === undefined
        ? []
        : sources.map((from) => ({
            from,

            next: { kind: step.kind, target, joinSources: sources, count: (step as any).count },
          }));
    }
    case "chain":
      return step.nodes.slice(1).flatMap((to, index) => {
        const source = step.nodes[index];
        return source === undefined
          ? []
          : transitionsOf({ kind: "to", from: [source], targets: [to] }, resolve);
      });
  }
  return [];
}

/** Every node and transition of the flow, in declaration order. */
export function collectFlow(flow: Flow): CollectedFlow {
  const resolver = createResolver();
  const transitions = flow.flatMap((step) => transitionsOf(step, resolver.resolve));
  return {
    nodes: resolver.nodes,
    transitions,
    violations: resolver.violations,
    keyOf: resolver.lookup,
  };
}
