import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { TERN_STATUSES, type Tern, type VersionScore } from "./types.js";

/** Ordered schema migrations; `PRAGMA user_version` = how many are applied. */
const MIGRATIONS: readonly string[] = [
  `CREATE TABLE threads (id TEXT PRIMARY KEY, bundle TEXT NOT NULL, created_at TEXT NOT NULL);
   CREATE TABLE terns (
     id TEXT PRIMARY KEY, thread_id TEXT NOT NULL REFERENCES threads(id), bundle TEXT NOT NULL,
     created_at TEXT NOT NULL, task TEXT NOT NULL, answer TEXT NOT NULL, status TEXT NOT NULL,
     stop_reason TEXT NOT NULL, route TEXT NOT NULL, steps TEXT NOT NULL, cost_usd REAL NOT NULL,
     prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, replay_of TEXT);
   CREATE INDEX terns_thread ON terns(thread_id);
   CREATE INDEX terns_version ON terns(bundle, prompt_version);
   CREATE TABLE scores (tern_id TEXT NOT NULL REFERENCES terns(id), judge TEXT NOT NULL,
     score REAL NOT NULL, created_at TEXT NOT NULL);`,
  // 2 — reasoning attempts (#79)
  `ALTER TABLE terns ADD COLUMN attempts TEXT NOT NULL DEFAULT '[]';`,
  // 3 — conversation memory: summaries of compacted turns (#77)
  `CREATE TABLE summaries (
     id TEXT PRIMARY KEY, thread_id TEXT NOT NULL REFERENCES threads(id), bundle TEXT NOT NULL,
     from_tern TEXT NOT NULL, to_tern TEXT NOT NULL, from_seq INTEGER NOT NULL, to_seq INTEGER NOT NULL,
     turns INTEGER NOT NULL, text TEXT NOT NULL, cost_usd REAL NOT NULL, created_at TEXT NOT NULL);
   CREATE INDEX summaries_thread ON summaries(thread_id, to_seq);`,
];

const TernRow = z.object({
  id: z.string(),
  thread_id: z.string(),
  bundle: z.string(),
  created_at: z.string(),
  task: z.string(),
  answer: z.string(),
  status: z.enum(TERN_STATUSES),
  stop_reason: z.string(),
  route: z.string(),
  steps: z.string(),
  cost_usd: z.number(),
  prompt_version: z.string(),
  model_version: z.string(),
  replay_of: z.string().nullable(),
  attempts: z.string(),
});

const Route = z.array(z.string());
const Attempts = z.array(
  z.object({
    agent: z.string(),
    attempt: z.number(),
    thinking: z.string(),
    score: z.number().nullable(),
    returned: z.boolean(),
    reason: z.enum(["threshold", "best", "last"]).optional(),
  }),
);
const Steps = z.array(z.object({ agent: z.string(), content: z.string() }));

const SummaryRow = z.object({
  prompt_version: z.string(),
  terns: z.number(),
  scored: z.number(),
  mean_score: z.number().nullable(),
  cost_usd: z.number(),
});

/** A database row → a typed Tern; rows are validated, never trusted. */
export function toTern(row: unknown): Tern {
  const r = TernRow.parse(row);
  return {
    id: r.id,
    threadId: r.thread_id,
    bundle: r.bundle,
    createdAt: r.created_at,
    task: r.task,
    answer: r.answer,
    status: r.status,
    stopReason: r.stop_reason,
    route: Route.parse(JSON.parse(r.route)),
    steps: Steps.parse(JSON.parse(r.steps)),
    costUsd: r.cost_usd,
    promptVersion: r.prompt_version,
    modelVersion: r.model_version,
    replayOf: r.replay_of,
    attempts: Attempts.parse(JSON.parse(r.attempts)),
  };
}

export function toVersionScore(row: unknown): VersionScore {
  const r = SummaryRow.parse(row);
  return {
    promptVersion: r.prompt_version,
    terns: r.terns,
    scored: r.scored,
    meanScore: r.mean_score,
    costUsd: r.cost_usd,
  };
}

function migrate(db: DatabaseSync): void {
  const { user_version: applied } = z
    .object({ user_version: z.number() })
    .parse(db.prepare("PRAGMA user_version").get());
  MIGRATIONS.slice(applied).forEach((sql, offset) => {
    db.exec(sql);
    db.exec(`PRAGMA user_version = ${String(applied + offset + 1)}`);
  });
}

/** Opens (creating directories) and migrates the database. */
export function openTernDatabase(path: string): DatabaseSync {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  migrate(db);
  return db;
}

export const placeholders = (count: number): string =>
  Array.from({ length: count }, () => "?").join(",");
