export const violation = (code, message, nodes) => ({ code, message, nodes });
/** The flow breaks assembly rules — every violation found, reported at once, before any model call. */
export class GraphRuleError extends Error {
    name = "GraphRuleError";
    violations;
    constructor(violations) {
        const lines = violations.map((item) => `  - [${item.code}] ${item.message}`);
        super(`The workflow's flow breaks ${String(violations.length)} rule(s):\n${lines.join("\n")}`);
        this.violations = violations;
    }
}
/** Throws when anything was found. */
export function throwIfViolated(violations) {
    if (violations.length > 0)
        throw new GraphRuleError(violations);
}
