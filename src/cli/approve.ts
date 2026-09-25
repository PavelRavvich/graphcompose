import { resumeAgent, type AgentRunResult, type RunDeps } from "../index.js";

/** Asks the human a question; undefined when input ended (Ctrl+D). */
export type Ask = (question: string) => Promise<string | undefined>;

/** Wraps a turn's work, e.g. to show a loader; identity by default. */
export type Busy = <T>(work: () => Promise<T>) => Promise<T>;

const idle: Busy = (work) => work();

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
    result = await busy(() => resumeAgent(paused, decision, deps));
  }
  return result;
}

/** First line under an answer: which conversation, and its trace when tracing is on. */
export function threadLine(result: AgentRunResult): string {
  return result.traceUrl === undefined
    ? `thread ${result.threadId}`
    : `thread ${result.threadId} · ${result.traceUrl}`;
}

/** One line under an answer: route and why the run stopped. */
export function summaryLine(result: AgentRunResult): string {
  const route = result.route.length > 0 ? result.route.join(" → ") : "(none)";
  return `${route} · stop: ${result.stopReason}`;
}
