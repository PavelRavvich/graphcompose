import type { UsageRecord } from "../finops/usage.js";

/** An agent's loop failed; carries its spend so the ledger still sees it. */
export class AgentFailedError extends Error {
  override name = "AgentFailedError";
  readonly agent: string;
  readonly usage: readonly UsageRecord[];

  constructor(agent: string, usage: readonly UsageRecord[], cause: unknown) {
    super(`Agent "${agent}" failed: ${cause instanceof Error ? cause.message : String(cause)}`, {
      cause,
    });
    this.agent = agent;
    this.usage = usage;
  }
}
