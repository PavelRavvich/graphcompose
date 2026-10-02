import type { LoopCall } from "./deps.js";

/** Where in an agent's loop a judge looks. */
export enum JudgePoint {
  BeforeToolCall = "beforeToolCall",
  AfterToolCall = "afterToolCall",
  BeforeAgentAnswer = "beforeAgentAnswer",
}

/** Whose judges look: the tool's own run first, then the agent's. */
export enum JudgeOwner {
  Tool = "tool",
  Agent = "agent",
}

/** One visit of a judge point: where, whose judges, which agent, which call (none before the answer). */
export interface JudgeVisit {
  readonly point: JudgePoint;
  readonly owner: JudgeOwner;
  readonly agent: string;
  readonly call?: LoopCall;
}

/**
 * The extension points of the move boundary, visited in order: tool judges `beforeToolCall` → agent
 * judges `beforeToolCall` → approval → run → `afterToolCall` (tool, then agent); `beforeAgentAnswer`
 * before the answer leaves the loop. Empty here — the judges themselves come with #123.
 */
export type JudgePoints = (visit: JudgeVisit) => Promise<void>;

export const noJudges: JudgePoints = () => Promise.resolve();

/** Visits a point for the tool's judges, then for the agent's. */
export async function visitToolThenAgent(
  judges: JudgePoints,
  point: JudgePoint,
  agent: string,
  call: LoopCall,
): Promise<void> {
  await judges({ point, owner: JudgeOwner.Tool, agent, call });
  await judges({ point, owner: JudgeOwner.Agent, agent, call });
}
