import { cyclesWithoutRouter } from "./cycles.js";
import { collectFlow, } from "./flow-nodes.js";
import { unboundedRouterCycles } from "./router-cycles.js";
import { routerRules } from "./router-rules.js";
import { throwIfViolated } from "./rule-error.js";
import { graphRules } from "./rules.js";
/**
 * Checks the flow against the assembly rules before any model call; **every** violation is reported
 * at once in one `GraphRuleError`.
 */
export function checkFlow(flow) {
    const collected = collectFlow(flow);
    throwIfViolated([
        ...collected.violations,
        ...graphRules(flow, collected),
        ...cyclesWithoutRouter(collected),
        ...routerRules(collected),
        ...unboundedRouterCycles(collected),
    ]);
    const next = new Map(collected.transitions.map((transition) => [transition.from, transition.next]));
    return { nodes: collected.nodes, next, collected };
}
