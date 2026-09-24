import type { RouteOutcome, RouterDecision } from "./types.js";
import type { UsageRecord } from "../finops/usage.js";

export const decided = (decision: RouterDecision, usage?: UsageRecord): RouteOutcome =>
  usage === undefined ? { kind: "decided", decision } : { kind: "decided", decision, usage };

export const failed = (reason: string, usage?: UsageRecord): RouteOutcome =>
  usage === undefined ? { kind: "failed", reason } : { kind: "failed", reason, usage };

export function errorReason(error: unknown): string {
  return `router error: ${error instanceof Error ? error.message : String(error)}`;
}
