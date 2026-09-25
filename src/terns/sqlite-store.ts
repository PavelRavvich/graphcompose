import { randomUUID } from "node:crypto";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import { z } from "zod";
import { openTernDatabase, placeholders, toTern, toVersionScore } from "./schema.js";
import { memoryMethods } from "./summaries.js";
import type { Tern, TernStore } from "./types.js";

type Clock = () => Date;
type Rows = (sql: string, ...params: SQLInputValue[]) => Tern[];

function threadMethods(
  db: DatabaseSync,
  now: Clock,
): Pick<TernStore, "createThread" | "hasThread"> {
  return {
    createThread: (bundle) => {
      const id = randomUUID();
      db.prepare("INSERT INTO threads VALUES (?, ?, ?)").run(id, bundle, now().toISOString());
      return Promise.resolve(id);
    },
    hasThread: (bundle, threadId) => {
      const row = db
        .prepare("SELECT 1 FROM threads WHERE id = ? AND bundle = ?")
        .get(threadId, bundle);
      return Promise.resolve(row !== undefined);
    },
  };
}

function ternWrites(db: DatabaseSync, now: Clock): Pick<TernStore, "append" | "complete"> {
  return {
    complete: (id, o) => {
      db.prepare(
        `UPDATE terns SET answer = ?, status = ?, stop_reason = ?, route = ?, steps = ?, cost_usd = ?,
         attempts = ? WHERE id = ?`,
      ).run(
        o.answer,
        o.status,
        o.stopReason,
        JSON.stringify(o.route),
        JSON.stringify(o.steps),
        o.costUsd,
        JSON.stringify(o.attempts),
        id,
      );
      return Promise.resolve();
    },
    append: (tern) => {
      const t: Tern = { ...tern, id: randomUUID(), createdAt: now().toISOString() };
      db.prepare("INSERT INTO terns VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
        t.id,
        t.threadId,
        t.bundle,
        t.createdAt,
        t.task,
        t.answer,
        t.status,
        t.stopReason,
        JSON.stringify(t.route),
        JSON.stringify(t.steps),
        t.costUsd,
        t.promptVersion,
        t.modelVersion,
        t.replayOf,
        JSON.stringify(t.attempts),
      );
      return Promise.resolve(t);
    },
  };
}

function ternReads(rows: Rows): Pick<TernStore, "lastTerns" | "byIds" | "byVersion" | "unscored"> {
  return {
    lastTerns: (threadId, limit) =>
      Promise.resolve(
        rows(
          `SELECT * FROM (SELECT rowid AS seq, * FROM terns WHERE thread_id = ?
           ORDER BY rowid DESC LIMIT ?) ORDER BY seq`,
          threadId,
          limit,
        ),
      ),
    byIds: (ids) =>
      Promise.resolve(
        rows(
          `SELECT * FROM terns WHERE id IN (${placeholders(ids.length)}) ORDER BY rowid`,
          ...ids,
        ),
      ),
    byVersion: (bundle, version, limit) =>
      Promise.resolve(
        rows(
          `SELECT * FROM terns WHERE bundle = ? AND prompt_version = ? AND replay_of IS NULL
           ORDER BY rowid LIMIT ?`,
          bundle,
          version,
          limit,
        ),
      ),
    unscored: (bundle, version, limit) =>
      Promise.resolve(
        rows(
          `SELECT t.* FROM terns t WHERE t.bundle = ? AND (? IS NULL OR t.prompt_version = ?)
           AND t.status = 'answered' AND NOT EXISTS (SELECT 1 FROM scores s WHERE s.tern_id = t.id)
           ORDER BY t.rowid LIMIT ?`,
          bundle,
          version ?? null,
          version ?? null,
          limit,
        ),
      ),
  };
}

const SUMMARY = `SELECT t.prompt_version, COUNT(DISTINCT t.id) AS terns, COUNT(s.score) AS scored,
    AVG(s.score) AS mean_score,
    (SELECT SUM(cost_usd) FROM terns x WHERE x.bundle = t.bundle AND x.prompt_version = t.prompt_version) AS cost_usd
  FROM terns t LEFT JOIN scores s ON s.tern_id = t.id
  WHERE t.bundle = ? GROUP BY t.prompt_version ORDER BY MIN(t.rowid)`;

function scoreMethods(
  db: DatabaseSync,
  now: Clock,
): Pick<TernStore, "saveScore" | "meanScore" | "summary"> {
  return {
    saveScore: (ternId, judge, score) => {
      db.prepare("INSERT INTO scores VALUES (?, ?, ?, ?)").run(
        ternId,
        judge,
        score,
        now().toISOString(),
      );
      return Promise.resolve();
    },
    meanScore: (ternIds) => {
      const sql = `SELECT AVG(score) AS mean FROM scores WHERE tern_id IN (${placeholders(ternIds.length)})`;
      const row = z.object({ mean: z.number().nullable() }).parse(db.prepare(sql).get(...ternIds));
      return Promise.resolve(row.mean);
    },
    summary: (bundle) => Promise.resolve(db.prepare(SUMMARY).all(bundle).map(toVersionScore)),
  };
}

/** Terns in SQLite (built-in `node:sqlite`). `:memory:` for tests. */
export function createSqliteTernStore(path: string, now: Clock = () => new Date()): TernStore {
  const db = openTernDatabase(path);
  const rows: Rows = (sql, ...params) =>
    db
      .prepare(sql)
      .all(...params)
      .map(toTern);
  return {
    ...threadMethods(db, now),
    ...ternWrites(db, now),
    ...ternReads(rows),
    ...scoreMethods(db, now),
    ...memoryMethods(db, now),
    close: () => {
      db.close();
    },
  };
}
