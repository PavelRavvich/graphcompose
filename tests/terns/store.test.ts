import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createSqliteTernStore, type NewTern } from "../../src/terns/index.js";

const tern = (overrides: Partial<NewTern> = {}): NewTern => ({
  threadId: "t",
  bundle: "b",
  task: "task",
  answer: "answer",
  status: "answered",
  stopReason: "done",
  route: ["alpha"],
  steps: [{ agent: "alpha", content: "answer" }],
  costUsd: 0.01,
  promptVersion: "p1",
  modelVersion: "m1",
  replayOf: null,
  ...overrides,
});

describe("SQLite Tern store", () => {
  it("creates threads per bundle", async () => {
    const store = createSqliteTernStore(":memory:");
    const id = await store.createThread("b");

    expect(await store.hasThread("b", id)).toBe(true);
    expect(await store.hasThread("other", id)).toBe(false);
  });

  it("appends Terns and returns the last N of a thread, oldest first", async () => {
    const store = createSqliteTernStore(":memory:");
    const thread = await store.createThread("b");
    for (const task of ["one", "two", "three"])
      await store.append(tern({ threadId: thread, task }));

    const last = await store.lastTerns(thread, 2);

    expect(last.map((item) => item.task)).toEqual(["two", "three"]);
    expect(last[0]?.steps).toEqual([{ agent: "alpha", content: "answer" }]);
    expect(await store.lastTerns(thread, 0)).toEqual([]);
  });

  it("records every outcome with its status", async () => {
    const store = createSqliteTernStore(":memory:");
    const thread = await store.createThread("b");
    const failed = await store.append(tern({ threadId: thread, status: "failed", answer: "" }));

    expect((await store.byIds([failed.id]))[0]?.status).toBe("failed");
  });

  it("scores only answered Terns and summarises by prompt version", async () => {
    const store = createSqliteTernStore(":memory:");
    const thread = await store.createThread("b");
    const a = await store.append(tern({ threadId: thread }));
    await store.append(tern({ threadId: thread, status: "failed" }));
    await store.append(tern({ threadId: thread, promptVersion: "p2" }));

    expect((await store.unscored("b", "p1", 10)).map((item) => item.id)).toEqual([a.id]);
    expect(await store.unscored("b", undefined, 10)).toHaveLength(2);
    await store.saveScore(a.id, "judge", 0.8);

    expect(await store.meanScore([a.id])).toBe(0.8);
    expect(await store.meanScore([])).toBeNull();
    expect(await store.summary("b")).toEqual([
      { promptVersion: "p1", terns: 2, scored: 1, meanScore: 0.8, costUsd: 0.02 },
      { promptVersion: "p2", terns: 1, scored: 0, meanScore: null, costUsd: 0.01 },
    ]);
  });

  it("lists original Terns of a version, not their replays", async () => {
    const store = createSqliteTernStore(":memory:");
    const thread = await store.createThread("b");
    const original = await store.append(tern({ threadId: thread }));
    await store.append(tern({ threadId: thread, replayOf: original.id }));

    expect((await store.byVersion("b", "p1", 10)).map((item) => item.id)).toEqual([original.id]);
  });

  it("opens an existing database without re-running migrations", async () => {
    const path = join(await mkdtemp(join(tmpdir(), "terns-")), "nested", "terns.sqlite");
    const first = createSqliteTernStore(path);
    const thread = await first.createThread("b");
    first.close();

    const second = createSqliteTernStore(path);

    expect(await second.hasThread("b", thread)).toBe(true);
    second.close();
  });
});
