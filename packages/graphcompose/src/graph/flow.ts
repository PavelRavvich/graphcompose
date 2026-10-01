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

/** A node of the flow: a decorated class (`@Entry`, `@Router`, `@Agent`, `@Conclusion`) or a named node. */
export type FlowNode = Class | NamedNode;

/** What a router may choose: a node or `Self`. */
export type ChoiceTarget = FlowNode | SelfTarget;

/** `from(A, B).to(C)` — an unconditional step from every source. */
export interface ToStep {
  readonly kind: "to";
  readonly from: readonly FlowNode[];
  readonly to: FlowNode;
}

/** `from(Router).choose(X, Y)` — the router picks one target. */
export interface ChooseStep {
  readonly kind: "choose";
  readonly from: readonly FlowNode[];
  readonly targets: readonly ChoiceTarget[];
}

/** `chain(A, B, C)` = `from(A).to(B)` + `from(B).to(C)`; a router only as the last element. */
export interface ChainStep {
  readonly kind: "chain";
  readonly nodes: readonly FlowNode[];
}

export type FlowStep = ToStep | ChooseStep | ChainStep;

/** The graph of a workflow: its transitions, in the workflow file. */
export type Flow = readonly FlowStep[];

/** What `from(...)` returns: the step's kind is chosen next. */
export interface FlowSource {
  readonly to: (target: FlowNode) => ToStep;
  readonly choose: (...targets: readonly [ChoiceTarget, ...ChoiceTarget[]]) => ChooseStep;
}

/** Starts a transition from one or more nodes (several = fan-in). */
export function from(...sources: readonly [FlowNode, ...FlowNode[]]): FlowSource {
  return {
    to: (target) => ({ kind: "to", from: sources, to: target }),
    choose: (...targets) => ({ kind: "choose", from: sources, targets }),
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

export const isSelf = (target: ChoiceTarget): target is SelfTarget =>
  typeof target === "object" && target.kind === "self";

export const isNamedNode = (target: ChoiceTarget): target is NamedNode =>
  typeof target === "object" && target.kind === "named-node";

/** The label a person reads in an error: the class name, or the named node's name and class. */
export function labelOf(target: ChoiceTarget): string {
  if (isSelf(target)) return "Self";
  if (isNamedNode(target)) return `node(${target.use.name}, "${target.name}")`;
  return target.name || "(anonymous class)";
}
