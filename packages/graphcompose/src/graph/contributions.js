import { mergeContent } from "./multimodal.js";
export function formatContributions(contributions) {
  if (contributions.length === 0) return "(none yet)";
  if (contributions.every((c) => typeof c.content === "string")) {
    return contributions.map((item) => `[${item.agent}]\n${item.content}`).join("\n\n");
  }
  const parts = [];
  for (const c of contributions) {
    parts.push(`[${c.agent}]\n`);
    parts.push(c.content);
    parts.push("\n\n");
  }
  return mergeContent(...parts);
}
/** The last `limit` turns, oldest first; empty when the limit is 0 or there is no history. */
export function formatHistory(history, limit) {
  const turns = limit > 0 ? history.slice(-limit) : [];
  if (turns.length === 0) return "";
  const lines = turns.map((turn) => {
    const replyWith =
      turn.status === "answered" ? turn.replyWith : `(${turn.status}) ${turn.replyWith}`;
    return `Q: ${turn.task}\nA: ${replyWith}`;
  });
  return `Previous turns:\n${lines.join("\n\n")}\n\n`;
}
/** The latest `limit` memory notes (compaction), oldest first; empty when none or limit 0. */
export function formatSummaries(summaries, limit) {
  const notes = limit > 0 ? summaries.slice(-limit) : [];
  if (notes.length === 0) return "";
  return `Earlier in this conversation:\n${notes.map((note, i) => `[${String(i + 1)}] ${note}`).join("\n\n")}\n\n`;
}
/** What a reader remembers of the thread: its summaries, then its raw previous turns. */
export const formatMemory = (state, limits) =>
  formatSummaries(state.summaries, limits.summaries) + formatHistory(state.history, limits.turns);
const clip = (text, max) => (text.length <= max ? text : `${text.slice(0, max)}…`);
/**
 * For an agent after a pause: its own tool calls decided in this turn, who decided and what the
 * tool returned — so it does not redo a write that is already done, or report it as not done.
 */
export function formatDecisionsForAgent(approvals, agent) {
  const own = approvals.filter((record) => record.agent === agent);
  if (own.length === 0) return "";
  const lines = own.map((record) => {
    const call = `${record.tool} ${clip(JSON.stringify(record.args), 200)}`;
    return record.approved
      ? `- ${call}: approved by ${record.by} and DONE — result: ${clip(record.result ?? "", 300)}`
      : `- ${call}: rejected by ${record.by}, NOT done — ${record.result}`;
  });
  return `\n\nYour tool calls decided in this turn (already settled — do not repeat them):\n${lines.join("\n")}`;
}
/** Adapter: graph state → the plain text a router sees. */
export function renderRouteInput(task, contributions, history = "") {
  const formattedContributions = formatContributions(contributions);
  return mergeContent(
    `${history}Task:\n${task}\n\nContributions so far:\n`,
    formattedContributions,
  );
}
