import type { Class } from "../components/injection.js";
import { componentOf } from "../components/metadata.js";

/** What a flow node is. Agents and routers are working nodes: their visits are steps. */
export type NodeKind = "entry" | "router" | "agent" | "conclusion";

/** What the flow knows about a node class: its kind and its name (the graph node's name). */
export interface NodeInfo {
  readonly kind: NodeKind;
  readonly name: string;
}

const nodes = new WeakMap<Class, NodeInfo>();

/** Called by node decorators (`@Router`, and `@Entry` / `@Conclusion`): marks a class as a flow node. */
export function recordNode(target: Class, info: NodeInfo): void {
  nodes.set(target, info);
}

/** A flow node's kind and name; `@Agent` classes are nodes too. Undefined for anything else. */
export function nodeInfoOf(target: Class): NodeInfo | undefined {
  const recorded = nodes.get(target);
  if (recorded !== undefined) return recorded;
  const component = componentOf(target);
  return component?.kind === "agent" ? { kind: "agent", name: component.meta.name } : undefined;
}

export const isWorkingKind = (kind: NodeKind): boolean => kind === "agent" || kind === "router";
