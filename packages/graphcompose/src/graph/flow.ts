import { nodeInfoOf } from "./node-kind.js";

import type { Class } from "../components/injection.js";

/**
 * A second place in the flow for a class that is already a node: declared **once** as a constant,
 * `const StyleReview = node(ReviewerAgent, "style-review")`, and referenced by that constant.
 */
export interface NamedNode {
  readonly kind: "named-node";
  readonly use: Class;
  readonly name: string;
}

/** `Self` in a router's `choose(...)` / `route(...)`: the node the router was called after. */
export interface SelfTarget {
  readonly kind: "self";
}

export const Self: SelfTarget = Object.freeze({ kind: "self" });

/** A node of the flow: a decorated class (`@WorkflowStart`, `@Router`, `@Agent`, `@WorkflowFinish`) or a named node. */
export type FlowNode = Class | NamedNode;

/** What a router may choose: a node or `Self`. */
export interface SkipTarget { readonly kind: "skip"; }
export type ChoiceTarget = FlowNode | SelfTarget | SkipTarget;

/** `from(A, B).next(C)` — an unconditional step from every source. */
export interface ToStep {
  readonly kind: "to";
  readonly from: readonly FlowNode[];
  readonly targets: readonly FlowNode[];
}

/** `from(Router).routeOne(X, Y)` — the router picks one target. */
export interface ChooseStep {
  readonly kind: "choose";
  readonly from: readonly FlowNode[];
  readonly targets: readonly ChoiceTarget[];
}

/** `chain(A, B, C)` = `from(A).next(B)` + `from(B).next(C)`; a router only as the last element. */
export interface ChainStep {
  readonly kind: "chain";
  readonly nodes: readonly FlowNode[];
}

export interface JoinStep {
  readonly kind: "join";
  readonly from: readonly FlowNode[];
  readonly target: FlowNode;
}


export interface ScatterStep {
  readonly kind: "scatter";
  readonly from: readonly FlowNode[];
  readonly target: FlowNode;
  readonly extractor: (payload: any) => any[];
}

export interface JoinAnyStep {
  readonly kind: "joinAny";
  readonly from: readonly FlowNode[];
  readonly target: FlowNode;
}

export interface JoinQuorumStep {
  readonly kind: "joinQuorum";
  readonly count: number;
  readonly from: readonly FlowNode[];
  readonly target: FlowNode;
}

export type FlowStep = ToStep | ChooseStep | ChainStep | JoinStep | ScatterStep | JoinAnyStep | JoinQuorumStep;


/** The graph of a workflow: its transitions, in the workflow file. */
export type Flow = readonly FlowStep[];

/** What `from(...)` returns: the step's kind is chosen next. */
export interface FlowSource {
  readonly next: (target: FlowNode) => ToStep;
  readonly nextParallel: (...args: any[]) => ToStep | ScatterStep; // Simplified for runtime AST
  readonly routeOne: (...targets: readonly [ChoiceTarget, ...ChoiceTarget[]]) => ChooseStep;
  readonly routeOneOrSkip: (target: ChoiceTarget) => ChooseStep;
  readonly routeManyOrSkip: (...targets: readonly [ChoiceTarget, ...ChoiceTarget[]]) => ChooseStep;
  readonly join: (target: FlowNode) => JoinStep;
  readonly joinAny: (target: FlowNode) => JoinAnyStep;
  readonly joinQuorum: (count: number, target: FlowNode) => JoinQuorumStep;
}

/** Starts a transition from one or more nodes (several = fan-in). */
export const Skip: ChoiceTarget = Object.freeze({ kind: "skip" });

export function from(...sources: readonly [FlowNode, ...FlowNode[]]): FlowSource {
  return {
    next: (target) => ({ kind: "to", from: sources, targets: [target] }),
    nextParallel: (...args) => {
      if (args.length === 2 && typeof args[1] === "function" && !nodeInfoOf(args[1])) {
        return { kind: "scatter", from: sources, target: args[0] as FlowNode, extractor: args[1] as any };
      }
      return { kind: "to", from: sources, targets: args as FlowNode[] };
    },
    routeOne: (...targets) => ({ kind: "choose", from: sources, targets }),
    routeOneOrSkip: (target) => ({ kind: "choose", from: sources, targets: [target, Skip] }),
    routeManyOrSkip: (...targets) => {
      // If the last argument is an object (constraints), we can parse it.
      // For now we just ignore it in AST or we can extract it.
      let actualTargets = targets;
      let constraints = undefined;
      if (targets.length > 0 && typeof targets[targets.length - 1] === "object" && !isSkip(targets[targets.length - 1] as any) && !isSelf(targets[targets.length - 1] as any) && !('name' in (targets[targets.length - 1] as any))) {
        constraints = targets.pop();
        actualTargets = targets;
      }
      return { kind: "choose", from: sources, targets: [...actualTargets, Skip] as any };
    },
    join: (target) => ({ kind: "join", from: sources, target }),
    joinAny: (target) => ({ kind: "joinAny", from: sources, target }),
    joinQuorum: (count, target) => ({ kind: "joinQuorum", from: sources, target, count }),
  };
}

/** A straight line of unconditional steps. */
export function chain(...nodes: readonly [FlowNode, FlowNode, ...FlowNode[]]): ChainStep {
  return { kind: "chain", nodes };
}

/** A second place for the same class under its own name. Declare it once, as a constant. */
export function node(use: Class, name: string): NamedNode {
  return Object.freeze({ kind: "named-node", use, name });
}

export const isSelf = (target: ChoiceTarget): target is SelfTarget => typeof target === "object" && target.kind === "self";
export const isSkip = (target: ChoiceTarget): target is SkipTarget => typeof target === "object" && target.kind === "skip";

export const isNamedNode = (target: ChoiceTarget): target is NamedNode =>
  typeof target === "object" && target.kind === "named-node";

/** The label a person reads in an error: the class name, or the named node's name and class. */
export function labelOf(target: ChoiceTarget): string {
  if (isSelf(target)) return "Self";
  if (isSkip(target)) return "Skip";
  if (isNamedNode(target)) return `node(${target.use.name}, "${target.name}")`;
  return target.name || "(anonymous class)";
}
