import { AgentFailedError, GuardFailedError } from "../graph/errors.js";
import { isNamedNode } from "../graph/flow.js";
import { LimitExceededError } from "../graph/limits.js";
import { nodeInfoOf } from "../graph/node-kind.js";
import { RouterDecisionError } from "../graph/nodes/flow-router.js";
import { GraphRuleError } from "../graph/rule-error.js";
/** The name a flow node has in runs, routes and results: its declared node name. */
export const nodeNameOf = (target) => isNamedNode(target) ? target.name : (nodeInfoOf(target)?.name ?? target.name);
function codesOf(error) {
    if (error instanceof GraphRuleError)
        return error.violations.map((item) => item.code);
    if (error instanceof LimitExceededError)
        return [error.key];
    return "code" in error && typeof error.code === "string" ? [error.code] : [];
}
function nodesOf(error) {
    if (error instanceof RouterDecisionError)
        return [error.router];
    if (error instanceof AgentFailedError)
        return [error.agent];
    if (error instanceof GuardFailedError)
        return [error.guard];
    if (error instanceof LimitExceededError)
        return error.path.slice(-1);
    if (error instanceof GraphRuleError)
        return error.violations.flatMap((item) => item.nodes);
    return [];
}
/** Codes and nodes of an error and every error it was caused by. */
export function failureFactsOf(error) {
    const codes = [];
    const nodes = [];
    let current = error;
    while (current instanceof Error) {
        codes.push(...codesOf(current));
        nodes.push(...nodesOf(current));
        current = current.cause;
    }
    return { codes, nodes };
}
