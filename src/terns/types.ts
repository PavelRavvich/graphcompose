/** Terminology: a Tern is one question → answer round (one run). A thread is a client's sequence of Terns. */

export const TERN_STATUSES = ["answered", "guarded", "failed", "paused"] as const;
export type TernStatus = (typeof TERN_STATUSES)[number];

/** One step inside a Tern: what one agent answered. */
export interface TernStep {
  readonly agent: string;
  readonly content: string;
}

export interface Tern {
  readonly id: string;
  readonly threadId: string;
  readonly bundle: string;
  readonly createdAt: string;
  readonly task: string;
  readonly answer: string;
  readonly status: TernStatus;
  readonly stopReason: string;
  readonly route: readonly string[];
  readonly steps: readonly TernStep[];
  readonly costUsd: number;
  readonly promptVersion: string;
  readonly modelVersion: string;
  /** Id of the Tern this one replays, if any. */
  readonly replayOf: string | null;
  /** Quality-gated attempts of agents with reasoning; empty otherwise. */
  readonly attempts: readonly TernAttempt[];
}

/** One reasoning attempt: which agent, which try, its judge score and whether it was returned. */
export interface TernAttempt {
  readonly agent: string;
  readonly attempt: number;
  readonly thinking: string;
  readonly score: number | null;
  readonly returned: boolean;
  readonly reason?: "threshold" | "best" | "last";
}

export type NewTern = Omit<Tern, "id" | "createdAt">;

/** A memory note of consecutive turns of a thread (compaction). Never re-compacted. */
export interface Summary {
  readonly id: string;
  readonly threadId: string;
  readonly bundle: string;
  readonly fromTernId: string;
  readonly toTernId: string;
  readonly turns: number;
  readonly text: string;
  readonly costUsd: number;
  readonly createdAt: string;
}

export type NewSummary = Omit<Summary, "id" | "createdAt">;

/** Conversation memory: which turns are not yet summarised, and the summaries. */
export interface MemoryStore {
  /** Turns of the thread after the last summary, oldest first. */
  readonly uncovered: (threadId: string) => Promise<Tern[]>;
  /** Up to `limit` turns right before `ternId`, oldest first. */
  readonly before: (threadId: string, ternId: string, limit: number) => Promise<Tern[]>;
  /** 1-based position of a turn in its thread. */
  readonly turnNumber: (threadId: string, ternId: string) => Promise<number>;
  readonly addSummary: (summary: NewSummary) => Promise<Summary>;
  /** The latest `limit` summaries of the thread, oldest first. */
  readonly latestSummaries: (threadId: string, limit: number) => Promise<Summary[]>;
  readonly summaryCount: (threadId: string) => Promise<number>;
}

/** What changes when a paused Tern finishes. */
export type TernOutcome = Pick<
  Tern,
  "answer" | "status" | "stopReason" | "route" | "steps" | "costUsd" | "attempts"
>;

/** Mean judge score and total cost of the Terns of one prompt version. */
export interface VersionScore {
  readonly promptVersion: string;
  readonly terns: number;
  readonly scored: number;
  readonly meanScore: number | null;
  readonly costUsd: number;
}

/** Durable memory of runs: threads, Terns, their quality scores and conversation summaries. */
export interface TernStore extends MemoryStore {
  readonly createThread: (bundle: string) => Promise<string>;
  readonly hasThread: (bundle: string, threadId: string) => Promise<boolean>;
  readonly append: (tern: NewTern) => Promise<Tern>;
  /** Completes a paused Tern (same id) with its final outcome. */
  readonly complete: (ternId: string, outcome: TernOutcome) => Promise<void>;
  /** The last `limit` Terns of a thread, oldest first. */
  readonly lastTerns: (threadId: string, limit: number) => Promise<Tern[]>;
  readonly byIds: (ids: readonly string[]) => Promise<Tern[]>;
  /** Original (non-replay) Terns of a prompt version, oldest first. */
  readonly byVersion: (bundle: string, promptVersion: string, limit: number) => Promise<Tern[]>;
  /** Answered Terns without a score, oldest first. */
  readonly unscored: (
    bundle: string,
    promptVersion: string | undefined,
    limit: number,
  ) => Promise<Tern[]>;
  readonly saveScore: (ternId: string, judge: string, score: number) => Promise<void>;
  readonly meanScore: (ternIds: readonly string[]) => Promise<number | null>;
  readonly summary: (bundle: string) => Promise<VersionScore[]>;
  readonly close: () => void;
}
