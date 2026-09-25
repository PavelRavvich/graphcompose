import type { ApprovalRecord } from "../pause/index.js";
/** What one agent added to the shared work. */
export interface Contribution {
  readonly agent: string;
  readonly content: string;
}

export function formatContributions(contributions: readonly Contribution[]): string {
  if (contributions.length === 0) return "(none yet)";
  return contributions.map((item) => `[${item.agent}]\n${item.content}`).join("\n\n");
}

/** One previous Tern of the thread as the agents see it. */
export interface HistoryTurn {
  readonly task: string;
  readonly answer: string;
  readonly status: string;
}

/** The last `limit` turns, oldest first; empty when the limit is 0 or there is no history. */
export function formatHistory(history: readonly HistoryTurn[], limit: number): string {
  const turns = limit > 0 ? history.slice(-limit) : [];
  if (turns.length === 0) return "";
  const lines = turns.map((turn) => {
    const answer = turn.status === "answered" ? turn.answer : `(${turn.status}) ${turn.answer}`;
    return `Q: ${turn.task}\nA: ${answer}`;
  });
  return `Previous turns:\n${lines.join("\n\n")}\n\n`;
}

/** The latest `limit` memory notes (compaction), oldest first; empty when none or limit 0. */
export function formatSummaries(summaries: readonly string[], limit: number): string {
  const notes = limit > 0 ? summaries.slice(-limit) : [];
  if (notes.length === 0) return "";
  return `Earlier in this conversation:\n${notes.map((note, i) => `[${String(i + 1)}] ${note}`).join("\n\n")}\n\n`;
}

/** What a reader remembers of the thread: its summaries, then its raw previous turns. */
export const formatMemory = (
  state: { readonly summaries: readonly string[]; readonly history: readonly HistoryTurn[] },
  limits: { readonly summaries: number; readonly turns: number },
): string =>
  formatSummaries(state.summaries, limits.summaries) + formatHistory(state.history, limits.turns);

const clip = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max)}…`;

/**
 * For an agent after a pause: its own tool calls a human decided in this turn, with what the tool
 * returned — so it does not redo a write that is already done, or report it as not done.
 */
export function formatDecisionsForAgent(
  approvals: readonly ApprovalRecord[],
  agent: string,
): string {
  const own = approvals.filter((record) => record.agent === agent);
  if (own.length === 0) return "";
  const lines = own.map((record) => {
    const call = `${record.tool} ${clip(JSON.stringify(record.args), 200)}`;
    return record.approved
      ? `- ${call}: approved by a human and DONE — result: ${clip(record.result, 300)}`
      : `- ${call}: rejected by a human, NOT done — ${record.result}`;
  });
  return `\n\nYour tool calls decided by a human in this turn (already settled — do not repeat them):\n${lines.join("\n")}`;
}

/** Adapter: graph state → the plain text a router sees. */
export function renderRouteInput(
  task: string,
  contributions: readonly Contribution[],
  history = "",
): string {
  return `${history}Task:\n${task}\n\nContributions so far:\n${formatContributions(contributions)}`;
}
