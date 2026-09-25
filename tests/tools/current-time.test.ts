import { describe, expect, it, vi } from "vitest";
import { toolOf } from "../../src/components/index.js";
import { CurrentTime } from "../../src/tools/index.js";

const ctx = {
  runId: "r",
  bundle: "b",
  agent: "a",
  signal: new AbortController().signal,
  reportCost: vi.fn(),
};
const tool = toolOf(new CurrentTime(() => new Date("2026-09-24T23:30:00Z")));

describe("current_time", () => {
  it("defaults to UTC", async () => {
    expect(await tool.invoke({}, ctx)).toMatchObject({
      kind: "ok",
      value: { iso: "2026-09-24T23:30:00.000Z", timeZone: "UTC" },
    });
  });

  it("formats the moment in the requested zone", async () => {
    const result = await tool.invoke({ timeZone: "Asia/Tokyo" }, ctx);

    expect(result.kind === "ok" && result.value.local).toContain("25 September 2026");
  });

  it("returns an error for an unknown zone", async () => {
    expect(await tool.invoke({ timeZone: "Mars/Olympus" }, ctx)).toMatchObject({ kind: "error" });
  });

  it("uses the real clock by default", async () => {
    const result = await toolOf(new CurrentTime()).invoke({}, ctx);

    expect(result.kind).toBe("ok");
  });
});
