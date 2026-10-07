const describe = (cause) => cause instanceof Error ? cause.message : String(cause);
/** A step of the run failed after spending money; carries that spend so the ledger still sees it. */
export class PaidStepError extends Error {
    name = "PaidStepError";
    usage;
    constructor(message, usage, cause) {
        super(message, { cause });
        this.usage = usage;
    }
}
/** An agent's loop failed. */
export class AgentFailedError extends PaidStepError {
    name = "AgentFailedError";
    agent;
    constructor(agent, usage, cause) {
        super(`Agent "${agent}" failed: ${describe(cause)}`, usage, cause);
        this.agent = agent;
    }
}
/** A guard could not decide — the run fails closed instead of letting content through. */
export class GuardFailedError extends PaidStepError {
    name = "GuardFailedError";
    guard;
    constructor(guard, usage, reason) {
        super(`Guard "${guard}" failed: ${reason}`, usage, reason);
        this.guard = guard;
    }
}
