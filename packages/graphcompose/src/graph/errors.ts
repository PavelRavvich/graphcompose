import type { UsageRecord } from "../finops/usage.js";

const describe = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

/** A step of the run failed after spending money; carries that spend so the ledger still sees it. */
export class PaidStepError extends Error {
  override name = "PaidStepError";
  readonly usage: readonly UsageRecord[];

  constructor(message: string, usage: readonly UsageRecord[], cause: unknown) {
    super(message, { cause });
    this.usage = usage;
  }
}

/** An agent's loop failed. */
export class AgentFailedError extends PaidStepError {
  override name = "AgentFailedError";
  readonly agent: string;

  constructor(agent: string, usage: readonly UsageRecord[], cause: unknown) {
    super(`Agent "${agent}" failed: ${describe(cause)}`, usage, cause);
    this.agent = agent;
  }
}

/** A guard could not decide — the run fails closed instead of letting content through. */
export class GuardFailedError extends PaidStepError {
  override name = "GuardFailedError";
  readonly guard: string;

  constructor(guard: string, usage: readonly UsageRecord[], reason: string) {
    super(`Guard "${guard}" failed: ${reason}`, usage, reason);
    this.guard = guard;
  }
}
