export { htmlToText, JOB_BOARDS } from "./boards.js";
import { z } from "zod";
import { boardReader, defaultFetchJson, JOB_BOARDS, type Candidate } from "./boards.js";
import { defineTool, type Tool } from "../../tools/index.js";
import { mapLimited, type FitJudge } from "./fit.js";

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const mentions = (text: string, term: string): boolean =>
  new RegExp(`(^|[^a-z0-9])${escapeRegExp(term.toLowerCase())}($|[^a-z0-9])`).test(text);

/** Share of the resume skills a job mentions, 0–100, and which ones. */
export function matchScore(
  skills: readonly string[],
  text: string,
): { score: number; matched: string[] } {
  const haystack = text.toLowerCase();
  const matched = skills.filter((skill) => skill.trim() !== "" && mentions(haystack, skill.trim()));
  return {
    score: skills.length === 0 ? 0 : Math.round((100 * matched.length) / skills.length),
    matched,
  };
}

/** Country names that also match its cities (Greenhouse often lists only the city). */
const LOCATION_ALIASES: Readonly<Record<string, readonly string[]>> = {
  israel: [
    "israel",
    "tel aviv",
    "herzliya",
    "haifa",
    "jerusalem",
    "netanya",
    "petah tikva",
    "ramat gan",
    "ra'anana",
    "raanana",
    "yokneam",
    "rehovot",
    "beer sheva",
    "hod hasharon",
    "caesarea",
  ],
};

const locationTerms = (locations: readonly string[]): string[] =>
  locations.flatMap(
    (location) =>
      LOCATION_ALIASES[location.trim().toLowerCase()] ?? [location.trim().toLowerCase()],
  );

/** At most this many jobs are judged per search — bounds time and cost. */
export const MAX_JUDGED = 400;
const JUDGE_CONCURRENCY = 8;

const Input = z.object({
  profile: z
    .string()
    .min(20)
    .describe(
      "What the user wants: role, primary languages, specialization, seniority, deal-breakers",
    ),
  locations: z
    .array(z.string())
    .min(1)
    .describe("Countries or cities; a country also matches its cities"),
  excludeTitleWords: z
    .array(z.string())
    .default([])
    .describe("Drop jobs whose title has any, e.g. Team Lead, Manager"),
  skills: z
    .array(z.string())
    .default([])
    .describe("Skills from the resume — shown as matched skills"),
  boards: z.array(z.string()).default([]).describe("Board tokens; empty = all known boards"),
  count: z.number().int().min(1).max(50).default(20),
  minFit: z
    .number()
    .min(0)
    .max(1)
    .default(0)
    .describe(
      "Optional floor on the judge's P(fit); 0 = rank only (the judge ranks well, its probabilities are compressed)",
    ),
});

const Job = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string(),
  department: z.string(),
  url: z.string(),
  updated: z.string(),
  fit: z.number(),
  matchedSkills: z.array(z.string()),
});

const Output = z.object({
  searched: z.array(z.string()),
  failedBoards: z.array(z.object({ board: z.string(), error: z.string() })),
  afterFilters: z.number(),
  judged: z.number(),
  judgeFailures: z.number(),
  passed: z.number(),
  jobs: z.array(Job),
});

export type GreenhouseTool = Tool<
  "greenhouse_jobs",
  z.output<typeof Input>,
  z.output<typeof Output>
>;
type Search = z.output<typeof Input>;

function passesFilters(job: Candidate, search: Search): boolean {
  const location = job.location.toLowerCase();
  const title = job.title.toLowerCase();
  return (
    locationTerms(search.locations).some((term) => location.includes(term)) &&
    !search.excludeTitleWords.some((word) => title.includes(word.trim().toLowerCase()))
  );
}

export interface GreenhouseDeps {
  readonly judge: FitJudge;
  readonly fetchJson?: (url: string) => Promise<unknown>;
}

/** Judges each job once per profile (cached); returns fits and the cost of new decisions. */
function fitScorer(
  judge: FitJudge,
): (
  profile: string,
  jobs: readonly Candidate[],
) => Promise<{ fits: (number | undefined)[]; costUsd: number }> {
  const cache = new Map<string, Promise<number | undefined>>();
  return async (profile: string, jobs: readonly Candidate[]) => {
    let costUsd = 0;
    const fits = await mapLimited(jobs, JUDGE_CONCURRENCY, (job) => {
      const key = `${profile}\u0000${job.url}`;
      const cached = cache.get(key);
      if (cached !== undefined) return cached;
      const pending = judge(profile, job).then((result) => {
        costUsd += result.costUsd;
        return result.fit;
      });
      cache.set(key, pending);
      return pending;
    });
    return { fits, costUsd };
  };
}

/**
 * Public Greenhouse boards (no key): hard filters (location, excluded titles), then a cheap judge
 * (Jev) rates every remaining job against what the user wants; the best `count` come back with
 * links. Board responses and judgements are cached for the session; judge spend is reported.
 */
export function createGreenhouseTool(deps: GreenhouseDeps): GreenhouseTool {
  const readBoards = boardReader(deps.fetchJson ?? defaultFetchJson);
  const score = fitScorer(deps.judge);
  return defineTool({
    name: "greenhouse_jobs",
    description:
      "Find jobs on Greenhouse boards that fit what the user wants; returns the best with links.",
    input: Input,
    output: Output,
    timeoutMs: 240_000,
    run: async (search, ctx) => {
      const requested = search.boards.length > 0 ? search.boards : Object.keys(JOB_BOARDS);
      const boards = [...new Set(requested.map((board) => board.trim().toLowerCase()))];
      const { failedBoards, candidates } = await readBoards(boards);
      const filtered = candidates.filter((job) => passesFilters(job, search));
      const judgedJobs = filtered.slice(0, MAX_JUDGED);
      const { fits, costUsd } = await score(search.profile, judgedJobs);
      ctx.reportCost(costUsd);
      const passed = judgedJobs
        .map((job, i) => ({ job, fit: fits[i] }))
        .filter(
          (item): item is { job: Candidate; fit: number } =>
            item.fit !== undefined && item.fit >= search.minFit,
        )
        .sort((a, b) => b.fit - a.fit || b.job.updated.localeCompare(a.job.updated));
      return {
        searched: boards,
        failedBoards,
        afterFilters: filtered.length,
        judged: judgedJobs.length,
        judgeFailures: fits.filter((fit) => fit === undefined).length,
        passed: passed.length,
        jobs: passed.slice(0, search.count).map(({ job, fit }) => ({
          company: job.company,
          title: job.title,
          location: job.location,
          department: job.department,
          url: job.url,
          updated: job.updated,
          fit: Math.round(fit * 100),
          matchedSkills: matchScore(search.skills, `${job.title} ${job.text}`).matched,
        })),
      };
    },
  });
}
