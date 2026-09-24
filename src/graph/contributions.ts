/** What one agent added to the shared work. */
export interface Contribution {
  readonly agent: string;
  readonly content: string;
}

export function formatContributions(contributions: readonly Contribution[]): string {
  if (contributions.length === 0) return "(none yet)";
  return contributions.map((item) => `[${item.agent}]\n${item.content}`).join("\n\n");
}

/** Adapter: graph state → the plain text a router sees. */
export function renderRouteInput(task: string, contributions: readonly Contribution[]): string {
  return `Task:\n${task}\n\nContributions so far:\n${formatContributions(contributions)}`;
}
