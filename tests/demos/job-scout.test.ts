import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { htmlToText, matchScore } from "../../src/demos/job-scout/greenhouse.js";
import { createReadResumeTool, MAX_RESUME_CHARS } from "../../src/demos/job-scout/resume.js";
import type { ToolContext } from "../../src/tools/index.js";

const ctx: ToolContext = {
  runId: "r",
  bundle: "job-scout",
  agent: "a",
  signal: new AbortController().signal,
  reportCost: () => undefined,
};

async function fileWith(name: string, content: string | Uint8Array): Promise<string> {
  const path = join(await mkdtemp(join(tmpdir(), "resume-")), name);
  await writeFile(path, content);
  return path;
}

describe("read_resume", () => {
  it("reads Markdown and text", async () => {
    const tool = createReadResumeTool();

    const result = await tool.invoke(
      { path: await fileWith("cv.md", "# Me\nTypeScript,   Kafka") },
      ctx,
    );

    expect(result).toMatchObject({
      kind: "ok",
      value: { format: "markdown", text: "# Me\nTypeScript, Kafka", truncated: false },
    });
  });

  it("reads PDF through the extractor and truncates long text", async () => {
    const tool = createReadResumeTool(() => Promise.resolve("x".repeat(MAX_RESUME_CHARS + 5)));

    const result = await tool.invoke(
      { path: await fileWith("cv.pdf", new Uint8Array([1, 2])) },
      ctx,
    );

    expect(result).toMatchObject({ kind: "ok", value: { format: "pdf", truncated: true } });
    expect(result.kind === "ok" && result.value.text.length).toBe(MAX_RESUME_CHARS);
  });

  it("reports unsupported formats and missing files to the model", async () => {
    const tool = createReadResumeTool();

    const docx = await tool.invoke({ path: await fileWith("cv.docx", "x") }, ctx);
    expect(docx.kind === "error" && docx.message).toContain("Unsupported");
    expect((await tool.invoke({ path: "/nope/cv.pdf" }, ctx)).kind).toBe("error");
  });
});

describe("greenhouse helpers", () => {
  it("turns escaped Greenhouse HTML into text", () => {
    expect(htmlToText("&lt;p&gt;Node.js &amp;amp; &lt;b&gt;Kafka&lt;/b&gt;&lt;/p&gt;")).toBe(
      "Node.js & Kafka",
    );
  });

  it("scores by the share of skills mentioned, as whole words", () => {
    expect(
      matchScore(
        ["TypeScript", "Kafka", "Go", "Java"],
        "We use typescript and Kafka; JavaScript too",
      ),
    ).toEqual({
      score: 50,
      matched: ["TypeScript", "Kafka"],
    });
    expect(matchScore([], "anything").score).toBe(0);
  });
});
