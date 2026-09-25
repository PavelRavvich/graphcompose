import { describe, expect, it, vi } from "vitest";
import { toolOf } from "../../src/components/index.js";
import { renderToolResult, toLangChainTool } from "../../src/tools/index.js";
import { Clock } from "../fixtures/test-workflow/test.workflow.js";

const ctx = {
  runId: "r",
  workflow: "b",
  agent: "a",
  signal: new AbortController().signal,
  reportCost: vi.fn(),
};

describe("LangChain adapter", () => {
  it("renders values as JSON, strings as is, errors readably", () => {
    expect(renderToolResult({ kind: "ok", value: { a: 1 } })).toBe('{"a":1}');
    expect(renderToolResult({ kind: "ok", value: "plain" })).toBe("plain");
    expect(renderToolResult({ kind: "error", message: "boom" })).toBe("Tool error: boom");
  });

  it("exposes name, description and input JSON Schema, and runs through invoke", async () => {
    const tool = toolOf(new Clock(() => new Date("2026-09-24T10:00:00Z")));
    const exposed = toLangChainTool(tool, ctx);

    expect(exposed.name).toBe("current_time");
    expect(exposed.description).toContain("IANA");
    const out: unknown = await exposed.invoke({ timeZone: "UTC" });
    expect(JSON.parse(String(out))).toMatchObject({
      iso: "2026-09-24T10:00:00.000Z",
      timeZone: "UTC",
    });
  });
});
