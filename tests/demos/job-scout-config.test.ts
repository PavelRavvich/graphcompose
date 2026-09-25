import { describe, expect, it } from "vitest";
import { probeBoard } from "../../src/demos/job-scout/boards.js";
import { jobScoutPrompts } from "../../src/demos/job-scout/prompts.js";
import { jobSearchConfig, JobSearchSchema } from "../../src/demos/job-scout/search.config.js";

describe("job-scout search config", () => {
  it("rejects a config without boards", () => {
    expect(() => JobSearchSchema.parse({ boards: {} })).toThrow(/at least one board/);
    expect(JobSearchSchema.parse({ boards: { acme: "Acme" } }).places).toEqual({});
  });

  it("ships an example config", () => {
    expect(Object.keys(jobSearchConfig.boards).length).toBeGreaterThan(10);
    expect(Object.keys(jobSearchConfig.places)).toContain("israel");
  });

  it("prompts list the configured boards and places", () => {
    const prompts = jobScoutPrompts({
      boards: { acme: "Acme" },
      places: { germany: ["Berlin", "Munich"] },
    });

    expect(prompts.scout).toContain(
      "Places the search knows (they also match their cities): germany.",
    );
    expect(prompts.profiler).toContain("acme (Acme)");
    expect(prompts.profiler).toContain("Proposed search brief:");
    expect(prompts.scout).toContain("Never add a filter of your own.");
    expect(prompts.scout).not.toMatch(/e\.g\. (Lead|Senior)/);
    expect(prompts.profiler).toContain("Boards: all 1");
    expect(prompts.profiler).not.toMatch(/^\d\. /m);
    expect(jobScoutPrompts({ boards: { acme: "Acme" }, places: {} }).scout).toContain(
      "matched literally",
    );
  });
});

describe("probeBoard", () => {
  const jobs = {
    jobs: [
      { location: { name: "Berlin, Germany" }, company_name: "Acme" },
      { location: { name: "Paris" } },
      { location: null },
    ],
  };

  it("counts live jobs and those in the place", async () => {
    expect(await probeBoard("acme", ["germany", "munich"], () => Promise.resolve(jobs))).toEqual({
      board: "acme",
      company: "Acme",
      jobs: 3,
      inPlace: 1,
    });
  });

  it("reports a board that fails", async () => {
    expect(await probeBoard("ghost", ["x"], () => Promise.reject(new Error("404")))).toEqual({
      board: "ghost",
      error: "404",
    });
  });
});
