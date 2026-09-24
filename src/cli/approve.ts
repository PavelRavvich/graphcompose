import { resumeAgent, type AgentRunResult, type RunDeps } from "../index.js";

/** Asks the human a question; undefined when input ended (Ctrl+D). */
export type Ask = (question: string) => Promise<string | undefined>;

/** A paused run asks the human in the terminal, then continues in the same process. */
export async function untilDone(
  first: AgentRunResult,
  deps: RunDeps<string>,
  ask: Ask,
): Promise<AgentRunResult> {
  let result = first;
  while (result.status === "paused" && result.pending !== undefined) {
    const { agent, tool, args } = result.pending;
    const reply = await ask(
      `${agent} wants to call ${tool} ${JSON.stringify(args)} — approve? [y/N] `,
    );
    const approve = /^y(es)?$/i.test((reply ?? "").trim());
    result = await resumeAgent(
      result,
      approve ? { approve } : { approve, note: "declined by the user" },
      deps,
    );
  }
  return result;
}

/** One line under an answer: route and why the run stopped. */
export function summaryLine(result: AgentRunResult): string {
  const route = result.route.length > 0 ? result.route.join(" → ") : "(none)";
  return `${route} · stop: ${result.stopReason}`;
}
