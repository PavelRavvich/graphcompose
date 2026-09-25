import { resumeAgent, type AgentRunResult, type RunDeps } from "../index.js";

/** Asks the human a question; undefined when input ended (Ctrl+D). */
export type Ask = (question: string) => Promise<string | undefined>;

/** Wraps a turn's work (loader, interrupt key); hands the work a signal to stop it. */
export type Busy = <T>(work: (signal: AbortSignal | undefined) => Promise<T>) => Promise<T>;

const idle: Busy = (work) => work(undefined);

/** A paused run asks the human in the terminal, then continues in the same process. */
export async function untilDone(
  first: AgentRunResult,
  deps: RunDeps<string>,
  ask: Ask,
  busy: Busy = idle,
): Promise<AgentRunResult> {
  let result = first;
  while (result.status === "paused" && result.pending !== undefined) {
    const { agent, tool, args } = result.pending;
    const reply = await ask(
      `${agent} wants to call ${tool} ${JSON.stringify(args)} — approve? [y/N] `,
    );
    const approve = /^y(es)?$/i.test((reply ?? "").trim());
    const paused = result;
    const decision = approve ? { approve } : { approve, note: "declined by the user" };
    result = await busy((signal) => resumeAgent(paused, decision, deps, { signal }));
  }
  return result;
}

/** First line under an answer: which conversation, and its trace when tracing is on. */
export function threadLine(result: AgentRunResult): string {
  return result.traceUrl === undefined
    ? `thread ${result.threadId}`
    : `thread ${result.threadId} · ${result.traceUrl}`;
}

/** Per agent with more than one attempt: `coder attempts: 0.62 → 0.74 → 0.79 · returned #3 (best)`. */
export function attemptsLines(result: AgentRunResult): string[] {
  const byAgent = new Map<string, NonNullable<AgentRunResult["attempts"]>[number][]>();
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
export function memoryLine(result: AgentRunResult): string | undefined {
  const c = result.compacted;
  if (c === undefined) return undefined;
  return `memory: turns ${String(c.fromTurn)}–${String(c.toTurn)} → summary ${String(c.summaries)}/${String(c.keep)}`;
}

/** One line under an answer: route and why the run stopped. */
export function summaryLine(result: AgentRunResult): string {
  const route = result.route.length > 0 ? result.route.join(" → ") : "(none)";
  return `${route} · stop: ${result.stopReason}`;
}
