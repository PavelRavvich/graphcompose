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

/** Adapter: graph state → the plain text a router sees. */
export function renderRouteInput(
  task: string,
  contributions: readonly Contribution[],
  history = "",
): string {
  return `${history}Task:\n${task}\n\nContributions so far:\n${formatContributions(contributions)}`;
}
