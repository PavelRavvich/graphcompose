import { componentOf } from "../components/metadata.js";
import { isNamedNode, isSelf, isReturn, isEnd, unwrapTarget, labelOf } from "./flow.js";
import { nodeInfoOf } from "./node-kind.js";
import { violation } from "./rule-error.js";
/**
 * A node's key in the flow — unique among its nodes. It is the node's name, except for a workflow
 * start: starts are never a step's target, so they have names of their own (`workflow-start.<name>`)
 * and a start and a finish may share a name (`chat` / `chat`).
 */
const flowKeyOf = (kind, name) => (kind === "workflow-start" ? `${kind}.${name}` : name);
function duplicateViolation(taken, target, name) {
  const both = [labelOf(taken), labelOf(target)];
  return isNamedNode(taken) && isNamedNode(target)
    ? violation("graph.duplicate-node-name", `node name "${name}" is declared twice`, both)
    : violation("graph.duplicate-node", `two nodes are named "${name}": ${both.join(", ")}`, both);
}
/** Resolves every class / named node of the flow to a node once; records node-level violations. */
function createResolver() {
  const nodes = new Map();
  const owners = new Map();
  const resolved = new Map();
  const violations = [];
  const register = (target) => {
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
    // Also register the compensation component so it's discovered by the container and agent builder
    const compMeta = componentOf(use);
    if (
      compMeta &&
      "meta" in compMeta &&
      compMeta.meta &&
      "compensate" in compMeta.meta &&
      compMeta.meta.compensate
    ) {
      resolve(compMeta.meta.compensate);
    }
    return key;
  };
  const resolve = (target) => {
    if (!resolved.has(target)) resolved.set(target, register(target));
    return resolved.get(target);
  };
  const lookup = (target) => resolved.get(target);
  return { nodes, violations, resolve, lookup };
}
const defined = (names) => names.filter((name) => name !== undefined);
function chooseTargets(targets, resolve) {
  const nodesOnly = [];
  const parallelTargets = [];
  const optionNames = [];
  let hasSelf = false;
  let hasReturn = false;
  let hasEnd = false;
  const extract = (t) => {
    if (isSelf(t)) hasSelf = true;
    else if (isReturn(t)) hasReturn = true;
    else if (isEnd(t)) hasEnd = true;
    else if (t.kind === "parallel") {
      const pTargets = t.targets.map((inner) => {
        if (isSelf(inner) || isReturn(inner) || isEnd(inner) || inner.kind === "parallel")
          throw new Error("Invalid parallel target");
        let actual = inner;
        if (inner.kind === "optional") actual = inner.target;
        nodesOnly.push(actual);
        return resolve(actual);
      });
      parallelTargets.push({ optionName: labelOf(t), targets: defined(pTargets) });
    } else if (t.kind === "optional") {
      extract(t.target);
    } else {
      nodesOnly.push(t);
      const res = resolve(t);
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
  };
}
function transitionsOf(step, resolve) {
  switch (step.kind) {
    case "to": {
      const sources = defined(step.from.map(resolve));
      const targets = defined(step.targets.map((t) => resolve(unwrapTarget(t))));
      if (targets.length === 0) return [];
      return sources.map((from) => ({ from, next: { kind: "to", targets } }));
    }
    case "catch": {
      const source = resolve(step.target);
      const nextNode = resolve(step.nextNode);
      if (!source || !nextNode) return [];
      return [{ from: source, next: { kind: "catch", errorType: step.errorType, nextNode } }];
    }
    case "join": {
      const sources = defined(step.from.map(resolve));
      const target = resolve(unwrapTarget(step.target));
      if (!target) return [];
      return sources.map((from) => ({
        from,
        next: { kind: "join", target, joinSources: sources },
      }));
    }
    case "choose": {
      const sources = defined(step.from.map(resolve));
      const next = {
        ...chooseTargets(step.targets, resolve),
        quorumRouter: step.quorumRouter?.name,
        quorumMin: step.quorumMin,
        quorumMax: step.quorumMax,
        quorumTimeoutSeconds: step.quorumTimeoutSeconds,
      };
      return sources.map((from) => ({ from, next }));
    }
    case "batchParallel": {
      console.log("batchParallel step:", step);
      const sources = defined(step.from.map(resolve));
      const target = resolve(step.target);
      return target === undefined
        ? []
        : sources.map((from) => ({
            from,
            next: { kind: "batchParallel", options: step.options, target, strategy: step.strategy },
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
export function collectFlow(flow) {
  const resolver = createResolver();
  const transitions = flow.flatMap((step) => transitionsOf(step, resolver.resolve));
  return {
    nodes: resolver.nodes,
    transitions,
    violations: resolver.violations,
    keyOf: resolver.lookup,
  };
}
