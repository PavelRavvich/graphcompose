import { randomUUID } from "node:crypto";
import { z } from "zod";
import { toTern } from "./schema.js";
const SummaryRow = z.object({
  id: z.string(),
  thread_id: z.string(),
  bundle: z.string(),
  from_tern: z.string(),
  to_tern: z.string(),
  turns: z.number(),
  text: z.string(),
  cost_usd: z.number(),
  created_at: z.string(),
});
const toSummary = (row) => {
  const r = SummaryRow.parse(row);
  return {
    id: r.id,
    threadId: r.thread_id,
    bundle: r.bundle,
    fromTernId: r.from_tern,
    toTernId: r.to_tern,
    turns: r.turns,
    text: r.text,
    costUsd: r.cost_usd,
    createdAt: r.created_at,
  };
};
const Count = z.object({ n: z.number() });
const Seq = z.object({ seq: z.number() });
const seqOf = (db, ternId) =>
  Seq.parse(db.prepare("SELECT rowid AS seq FROM terns WHERE id = ?").get(ternId)).seq;
const lastCovered = (db, threadId) =>
  Count.parse(
    db
      .prepare("SELECT COALESCE(MAX(to_seq), 0) AS n FROM summaries WHERE thread_id = ?")
      .get(threadId),
  ).n;
function turnReads(db) {
  const terns = (sql, ...params) =>
    db
      .prepare(sql)
      .all(...params)
      .map(toTern);
  return {
    uncovered: (threadId) =>
      Promise.resolve(
        terns(
          "SELECT * FROM terns WHERE thread_id = ? AND rowid > ? ORDER BY rowid",
          threadId,
          lastCovered(db, threadId),
        ),
      ),
    before: (threadId, ternId, limit) =>
      Promise.resolve(
        terns(
          `SELECT * FROM (SELECT rowid AS seq, * FROM terns WHERE thread_id = ? AND rowid < ?
           ORDER BY rowid DESC LIMIT ?) ORDER BY seq`,
          threadId,
          seqOf(db, ternId),
          limit,
        ),
      ),
    turnNumber: (threadId, ternId) =>
      Promise.resolve(
        Count.parse(
          db
            .prepare("SELECT COUNT(*) AS n FROM terns WHERE thread_id = ? AND rowid <= ?")
            .get(threadId, seqOf(db, ternId)),
        ).n,
      ),
  };
}
function summaryMethods(db, now) {
  return {
    addSummary: (summary) => {
      const stored = { ...summary, id: randomUUID(), createdAt: now().toISOString() };
      db.prepare("INSERT INTO summaries VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
        stored.id,
        stored.threadId,
        stored.bundle,
        stored.fromTernId,
        stored.toTernId,
        seqOf(db, stored.fromTernId),
        seqOf(db, stored.toTernId),
        stored.turns,
        stored.text,
        stored.costUsd,
        stored.createdAt,
      );
      return Promise.resolve(stored);
    },
    latestSummaries: (threadId, limit) =>
      Promise.resolve(
        db
          .prepare(
            `SELECT * FROM (SELECT * FROM summaries WHERE thread_id = ? ORDER BY to_seq DESC LIMIT ?)
             ORDER BY to_seq`,
          )
          .all(threadId, limit)
          .map(toSummary),
      ),
    summaryCount: (threadId) =>
      Promise.resolve(
        Count.parse(
          db.prepare("SELECT COUNT(*) AS n FROM summaries WHERE thread_id = ?").get(threadId),
        ).n,
      ),
  };
}
/** Conversation memory on the Tern database (table `summaries`, migration 3). */
export const memoryMethods = (db, now) => ({
  ...turnReads(db),
  ...summaryMethods(db, now),
});
