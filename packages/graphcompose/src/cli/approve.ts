import { userInfo } from "node:os";
import type { ToolCallApprovalDecision } from "../dto/standard/framework.js";
import type { App, RunResult } from "../app/types.js";

/** Asks the human a question; undefined when input ended (Ctrl+D). */
export type Ask = (question: string) => Promise<string | undefined>;

/** Wraps a turn's work (loader, interrupt key); hands the work a signal to stop it. */
export type Busy = <T>(work: (signal: AbortSignal | undefined) => Promise<T>) => Promise<T>;

const idle: Busy = (work) => work(undefined);

/** The terminal's decision on a call: `by` is the OS user who answered. */
export function terminalDecision(approved: boolean): ToolCallApprovalDecision {
  const by = userInfo().username;
  return approved ? { approved, by } : { approved, by, reason: "declined in the terminal" };
}

/** A paused run asks in the terminal, then continues in the same process. */
export async function untilDone(
  first: RunResult,
  app: Pick<App, "resume">,
  ask: Ask,
  busy: Busy = idle,
): Promise<RunResult> {
  let result = first;
  while (result.pause !== undefined) {
    const { agent, tool, args } = result.pause;
    const reply = await ask(
      `${agent} wants to call ${tool} ${JSON.stringify(args)} — approve? [y/N] `,
    );
    const approved = /^y(es)?$/i.test((reply ?? "").trim());
    const { thread } = result;
    const decision = terminalDecision(approved);
    result = await busy((signal) => app.resume(thread, decision, { signal }));
  }
  return result;
}

/** First line under an answer: which conversation, and its trace when tracing is on. */
export function threadLine(result: Pick<RunResult, "thread" | "traceUrl">): string {
  return result.traceUrl === undefined
    ? `thread ${result.thread}`
    : `thread ${result.thread} · ${result.traceUrl}`;
}

/** Per agent with more than one attempt: `coder attempts: 0.62 → 0.74 → 0.79 · returned #3 (best)`. */
export function attemptsLines(result: Pick<RunResult, "attempts">): string[] {
  const byAgent = new Map<string, NonNullable<RunResult["attempts"]>[number][]>();
  for (const attempt of result.attempts ?? []) {
    byAgent.set(attempt.agent, [...(byAgent.get(attempt.agent) ?? []), attempt]);
  }
  return [...byAgent.entries()]
    .filter(([, attempts]) => attempts.length > 1)
    .map(([agent, attempts]) => {
      const scores = attempts.map((a) => (a.score === null ? "?" : a.score.toFixed(2))).join(" → ");
      const returned = attempts.find((a) => a.returned);
      const which =
        returned === undefined
          ? ""
          : ` · returned #${String(returned.attempt)} (${returned.reason ?? "?"})`;
      return `${agent} attempts: ${scores}${which}`;
    });
}

/** `memory: turns 1–5 → summary 1/10` when this turn compacted the conversation. */
export function memoryLine(result: Pick<RunResult, "compacted">): string | undefined {
  const c = result.compacted;
  if (c === undefined) return undefined;
  return `memory: turns ${String(c.fromTurn)}–${String(c.toTurn)} → summary ${String(c.summaries)}/${String(c.keep)}`;
}

/** One line under an answer: route and why the run stopped. */
export function summaryLine(result: Pick<RunResult, "route" | "stopReason">): string {
  const route = result.route.length > 0 ? result.route.join(" → ") : "(none)";
  return `${route} · stop: ${result.stopReason}`;
}
