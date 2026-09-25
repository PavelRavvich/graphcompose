import {
  FIT_QUESTION,
  mapLimited,
  routerFitJudge,
  type FitJudge,
} from "../../src/demos/job-scout/fit.js";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  createGreenhouseTool,
  htmlToText,
  matchScore,
} from "../../src/demos/job-scout/greenhouse.js";
import { createReadResumeTool, MAX_RESUME_CHARS } from "../../src/demos/job-scout/resume.js";
import type { Router } from "../../src/routers/index.js";
import type { ToolContext } from "../../src/tools/index.js";
import { usageRecord } from "../helpers.js";

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

const board = (jobs: object[]) => ({ jobs });
const job = (title: string, location: string, content: string) => ({
  title,
  absolute_url: `https://example.com/${title.replace(/\s/g, "-")}`,
  updated_at: "2026-09-20T10:00:00-04:00",
  location: { name: location },
  departments: [{ name: "R&D" }],
  content,
});

const boards: Record<string, object> = {
  fireblocks: board([
    job(
      "Senior Backend Engineer",
      "Tel Aviv-Yafo, Tel Aviv District, Israel",
      "&lt;p&gt;Java, Kotlin, Kafka&lt;/p&gt;",
    ),
    job("Team Lead, Backend", "Tel Aviv, Israel", "Java"),
    job("Backend Engineer", "New York", "Java"),
  ]),
  similarweb: board([job("Backend Engineer, Platform", "Tel Aviv", "Kotlin and Spring")]),
  jfrog: board([job("Sales Engineer", "Herzliya, Israel", "sales")]),
};

const fetchJson = vi.fn((url: string) => {
  const token = /boards\/([^/]+)\/jobs/.exec(url)?.[1] ?? "";
  const body = boards[token];
  return body === undefined ? Promise.reject(new Error("404")) : Promise.resolve(body);
});

/** Fits by title word; "Sales" is a no-fit; costs $0.00002 per decision. */
const judge = vi.fn<FitJudge>((_profile, j) =>
  Promise.resolve({
    fit: j.title.includes("Sales") ? 0.1 : j.title.includes("Senior") ? 0.9 : 0.7,
    costUsd: 0.00002,
  }),
);

const search = {
  profile: "Senior backend, Java or Kotlin primary; no management roles",
  locations: ["Israel"],
  excludeTitleWords: ["Team Lead"],
  skills: ["Java", "Kotlin", "Kafka"],
  boards: ["fireblocks", "similarweb", "jfrog", "ghost"],
};

describe("greenhouse_jobs", () => {
  it("filters hard, lets the judge rank the rest and returns the best with links", async () => {
    const costs: number[] = [];
    const tool = createGreenhouseTool({ judge, fetchJson });

    const result = await tool.invoke(
      { ...search, minFit: 0.5 },
      { ...ctx, reportCost: (usd) => costs.push(usd) },
    );

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.value.jobs.map((j) => [j.company, j.title, j.fit])).toEqual([
      ["Fireblocks", "Senior Backend Engineer", 90],
      ["Similarweb", "Backend Engineer, Platform", 70],
    ]);
    expect(result.value.jobs[0]?.matchedSkills).toEqual(["Java", "Kotlin", "Kafka"]);
    expect(result.value).toMatchObject({ afterFilters: 3, judged: 3, passed: 2, judgeFailures: 0 });
    expect(result.value.failedBoards).toEqual([{ board: "ghost", error: "Error: 404" }]);
    expect(costs[0]).toBeCloseTo(0.00006);
  });

  it("ranks everything by default (no floor)", async () => {
    const tool = createGreenhouseTool({ judge, fetchJson });

    const result = await tool.invoke(search, ctx);

    expect(result.kind === "ok" && result.value.jobs.map((j) => j.fit)).toEqual([90, 70, 10]);
  });

  it("caches boards and judgements for the same profile", async () => {
    fetchJson.mockClear();
    judge.mockClear();
    const tool = createGreenhouseTool({ judge, fetchJson });

    await tool.invoke({ ...search, boards: ["similarweb"] }, ctx);
    await tool.invoke({ ...search, boards: ["similarweb"], count: 5 }, ctx);

    expect(fetchJson).toHaveBeenCalledTimes(1);
    expect(judge).toHaveBeenCalledTimes(1);
  });

  it("uses all known boards by default and counts judge failures", async () => {
    const failing: FitJudge = () => Promise.resolve({ fit: undefined, costUsd: 0 });
    const tool = createGreenhouseTool({ judge: failing, fetchJson });

    const result = await tool.invoke({ profile: search.profile, locations: ["Israel"] }, ctx);

    expect(result.kind === "ok" && result.value.searched.length).toBeGreaterThan(10);
    expect(result.kind === "ok" && result.value.judgeFailures).toBe(4);
  });
});

describe("routerFitJudge", () => {
  const jobText = {
    company: "Acme",
    title: "Backend",
    location: "Haifa",
    department: "R&D",
    text: "Java",
  };

  it("asks the router the fit question and returns P(fit) with its cost", async () => {
    const route = vi.fn<Router["route"]>(() =>
      Promise.resolve({
        kind: "decided",
        decision: { next: "no_fit", reason: "", confidence: 0.8 },
        usage: usageRecord("router:job-fit", 0.00002),
      }),
    );

    const result = await routerFitJudge({ name: "job-fit", route })("Java backend", jobText);

    expect(result.fit).toBeCloseTo(0.2);
    expect(result.costUsd).toBe(0.00002);
    expect(route.mock.calls[0]?.[0].instructions).toBe(FIT_QUESTION);
  });

  it("reports a failed decision as no fit value", async () => {
    const route = vi.fn<Router["route"]>(() => Promise.resolve({ kind: "failed", reason: "down" }));

    expect(await routerFitJudge({ name: "job-fit", route })("x", jobText)).toEqual({
      fit: undefined,
      costUsd: 0,
    });
  });

  it("mapLimited keeps order under a concurrency limit", async () => {
    expect(await mapLimited([3, 1, 2], 2, (n) => Promise.resolve(n * 10))).toEqual([30, 10, 20]);
  });
});
