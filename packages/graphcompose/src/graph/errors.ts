import { GraphComposeError, type ErrorDetails } from "../core/errors.js";
import type { UsageRecord } from "../finops/usage.js";

const describe = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

/** A step of the run failed after spending money; carries that spend so the ledger still sees it. */
export class PaidStepError extends GraphComposeError {
  static override readonly code: string = "step";
  override name = "PaidStepError";
  readonly usage: readonly UsageRecord[];

  constructor(
    message: string,
    usage: readonly UsageRecord[],
    cause: unknown,
    details?: ErrorDetails,
  ) {
    super(message, { cause, ...(details === undefined ? {} : { details }) });
    this.usage = usage;
  }
}

/** An agent's loop failed. */
export class AgentFailedError extends PaidStepError {
  static override readonly code: string = "step.agent";
  override name = "AgentFailedError";
  readonly agent: string;

  constructor(agent: string, usage: readonly UsageRecord[], cause: unknown) {
    super(`Agent "${agent}" failed: ${describe(cause)}`, usage, cause, { agent });
    this.agent = agent;
  }
}

/** A guard could not routeTo — the run fails closed instead of letting content through. */
export class GuardFailedError extends PaidStepError {
  static override readonly code: string = "step.guard";
  override name = "GuardFailedError";
  readonly guard: string;

  constructor(guard: string, usage: readonly UsageRecord[], reason: string) {
    super(`Guard "${guard}" failed: ${reason}`, usage, reason, { guard });
    this.guard = guard;
  }
}
