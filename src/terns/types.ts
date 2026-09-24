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
}

export type NewTern = Omit<Tern, "id" | "createdAt">;

/** Mean judge score and total cost of the Terns of one prompt version. */
export interface VersionScore {
  readonly promptVersion: string;
  readonly terns: number;
  readonly scored: number;
  readonly meanScore: number | null;
  readonly costUsd: number;
}

/** Durable memory of runs: threads, Terns and their quality scores. */
export interface TernStore {
  readonly createThread: (bundle: string) => Promise<string>;
  readonly hasThread: (bundle: string, threadId: string) => Promise<boolean>;
  readonly append: (tern: NewTern) => Promise<Tern>;
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
