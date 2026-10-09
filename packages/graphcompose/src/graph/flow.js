export const Self = Object.freeze({ kind: "self" });
export function background(target) {
  return { kind: "background", target };
}
export const bg = background;
export const unwrapTarget = (target) =>
  typeof target === "object" && target !== null && "kind" in target && target.kind === "background"
    ? target.target
    : target;
export function parallel(...targets) {
  // Validate no Self or Skip inside
  for (const t of targets) {
    if (isSelf(t) || isReturn(t) || isEnd(t)) {
      throw new Error("Cannot use Self or Skip inside parallel()");
    }
  }
  return { kind: "parallel", targets };
}
export function optional(target) {
  return { kind: "optional", target };
}
export const isParallel = (t) => typeof t === "object" && t !== null && t.kind === "parallel";
export const isOptional = (t) => typeof t === "object" && t !== null && t.kind === "optional";
/** Starts a transition from one or more nodes (several = fan-in). */
export const Return = Object.freeze({ kind: "return" });
export const End = Object.freeze({ kind: "end" });
export function from(...sources) {
  return {
    next: (target) => ({ kind: "to", from: sources, targets: [target] }),
    nextParallel: (...targets) => ({ kind: "to", from: sources, targets }),
    join: (target) => ({ kind: "join", from: sources, target }),
    batchParallel: (target, strategy, options) => ({
      kind: "batchParallel",
      from: sources,
      target,
      strategy,
      options,
    }),
    routes: (...targets) => ({ kind: "choose", from: sources, targets }),
    joinQuorum: (router, options) => ({
      routes: (...targets) => ({
        kind: "choose",
        from: sources,
        targets,
        quorumRouter: router,
        quorumMin: options.min,
        quorumMax: options.max,
        quorumTimeoutSeconds: options.timeoutSeconds,
      }),
    }),
  };
}
/** A straight line of unconditional steps. */
export function chain(...nodes) {
  return { kind: "chain", nodes };
}
/** A second place for the same class under its own name. Declare it once, as a constant. */
export function node(use, name) {
  return Object.freeze({ kind: "named-node", use, name });
}
export const isBackgroundTarget = (target) =>
  typeof target === "object" && target !== null && "kind" in target && target.kind === "background";
export const isSelf = (target) => typeof target === "object" && target.kind === "self";
export const isReturn = (target) =>
  typeof target === "object" && target !== null && target.kind === "return";
export const isEnd = (target) =>
  typeof target === "object" && target !== null && target.kind === "end";
export const isNamedNode = (target) => typeof target === "object" && target.kind === "named-node";
/** The label a person reads in an error: the class name, or the named node's name and class. */
export function labelOf(target) {
  if (isSelf(target)) return "Self";
  if (isReturn(target)) return "Return";
  if (isEnd(target)) return "End";
  if (isNamedNode(target)) return `node(${target.use.name}, "${target.name}")`;
  if (isParallel(target)) return `parallel(${target.targets.map(labelOf).join(", ")})`;
  if (isOptional(target)) return `optional(${labelOf(target.target)})`;
  return target.name || "(anonymous class)";
}
export function catchError(target, errorType = Error) {
  return {
    next: (nextNode) => ({
      kind: "catch",
      target,
      errorType,
      nextNode,
    }),
    compensateWith: (nextNode) => ({
      kind: "catch",
      target,
      errorType,
      nextNode,
    }),
  };
}
