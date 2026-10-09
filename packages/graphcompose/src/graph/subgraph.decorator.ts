import type { Class } from "../components/injection.js";
import { recordNode } from "./node-kind.js";

export interface SubgraphOptions {
  readonly name: string;
  readonly workflow: Class;
  readonly start: Class;
  readonly finish: Class;
}

const subgraphs = new WeakMap<Class, SubgraphOptions>();

export function Subgraph(options: SubgraphOptions) {
  return <C extends Class>(target: C): C => {
    recordNode(target, { kind: "subgraph", name: options.name });
    subgraphs.set(target, options);
    return target;
  };
}

export const subgraphMetaOf = (target: Class): SubgraphOptions | undefined =>
  subgraphs.get(target);
