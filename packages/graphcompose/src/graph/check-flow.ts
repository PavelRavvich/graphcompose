import { cyclesWithoutRouter } from "./cycles.js";
import type { Flow } from "./flow.js";
import {
  collectFlow,
  type CollectedFlow,
  type FlowNodeRef,
  type NextDeclaration,
} from "./flow-nodes.js";
import { unboundedRouterCycles } from "./router-cycles.js";
import { routerRules } from "./router-rules.js";
import { throwIfViolated } from "./rule-error.js";
import { graphRules } from "./rules.js";

/** A flow that passed every assembly rule: nodes by name and each node's one next step. */
export interface FlowModel {
  readonly nodes: ReadonlyMap<string, FlowNodeRef>;
  readonly next: ReadonlyMap<string, NextDeclaration>;
  /** Kept for later lookups (route targets by class). */
  readonly collected: CollectedFlow;
}

/**
 * Checks the flow against the assembly rules before any model call; **every** violation is reported
 * at once in one `GraphRuleError`.
 */
export function checkFlow(flow: Flow): FlowModel {
  const collected = collectFlow(flow);
  throwIfViolated([
    ...collected.violations,
    ...graphRules(flow, collected),
    ...cyclesWithoutRouter(collected),
    ...routerRules(collected),
    ...unboundedRouterCycles(collected),
  ]);
  const next = new Map(
    collected.transitions.map((transition) => [transition.from, transition.next]),
  );
  return { nodes: collected.nodes, next, collected };
}
