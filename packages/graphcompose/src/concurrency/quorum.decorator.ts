import { callerFile } from "../components/call-site.js";
import type { Class } from "../components/injection.js";
import { recordNode } from "../graph/node-kind.js";

/** Status of the quorum evaluation. */
export type QuorumStatus = "Met" | "Failed";

/** Strategy for evaluating and routing a quorum of parallel branches. */
export interface QuorumStrategy<T = any> {
  /** 
   * Evaluates if a branch's result counts towards the quorum limit.
   * Return `true` to count it, `false` to ignore it.
   */
  filterVote(state: T): Promise<boolean> | boolean;
  
  /** 
   * Decides the next step after the quorum is evaluated.
   * @param isMet `true` if the required number of votes was reached, `false` otherwise.
   * @returns The class reference of the next step (e.g., an Agent, Router, Return, or End).
   */
  route(state: T, isMet: boolean): Promise<any> | any;
}

export interface QuorumRouterOptions {
  readonly min: number;
}

export interface QuorumRouterMeta extends QuorumRouterOptions {
  readonly source?: string;
}

const quorumRouters = new WeakMap<Class, QuorumRouterMeta>();

/**
 * `@QuorumRouter` — an active barrier that intercepts parallel branches as they finish.
 * It counts votes using `filterVote()` and cancels remaining branches as soon as `min` is reached.
 */
export function QuorumRouter(options: QuorumRouterOptions) {
  const source = callerFile();
  return <C extends Class>(value: C): C => {
    recordNode(value, { kind: "quorumRouter", name: value.name });
    quorumRouters.set(value, source === undefined ? options : { ...options, source });
    return value;
  };
}

export const quorumRouterMetaOf = (target: Class): QuorumRouterMeta | undefined => quorumRouters.get(target);
