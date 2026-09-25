import { z } from "zod";
import type { JobText } from "./fit.js";

/**
 * Greenhouse job boards with live Israeli jobs (probed 2026-09: ~140 Israeli tech and global
 * companies with Israeli R&D; ordered by Israeli openings). Greenhouse has no global search —
 * every company has its own board.
 */
export const JOB_BOARDS: Readonly<Record<string, string>> = {
  catonetworks: "Cato Networks",
  similarweb: "Similarweb",
  taboola: "Taboola",
  payoneer: "Payoneer",
  nice: "NICE",
  jfrog: "JFrog",
  transmitsecurity: "Transmit Security",
  appsflyer: "AppsFlyer",
  via: "Via",
  fireblocks: "Fireblocks",
  gitlab: "GitLab",
  axonius: "Axonius",
  melio: "Melio",
  riskified: "Riskified",
  mongodb: "MongoDB",
  torq: "Torq",
  forter: "Forter",
  saltsecurity: "Salt Security",
  yotpo: "Yotpo",
  apiiro: "Apiiro",
  datarails: "Datarails",
  elastic: "Elastic",
  safebreach: "SafeBreach",
  zscaler: "Zscaler",
  cymulate: "Cymulate",
  rubrik: "Rubrik",
  stripe: "Stripe",
  datadog: "Datadog",
  grafanalabs: "Grafana Labs",
  obligo: "Obligo",
  orcasecurity: "Orca Security",
  bigid: "BigID",
  databricks: "Databricks",
  innovid: "Innovid",
  jamf: "Jamf",
  lightricks: "Lightricks",
  okta: "Okta",
  island: "Island",
};

const BoardResponse = z.object({
  jobs: z.array(
    z.object({
      title: z.string(),
      absolute_url: z.string(),
      updated_at: z.string(),
      location: z.object({ name: z.string() }).nullable().optional(),
      departments: z.array(z.object({ name: z.string() })).default([]),
      content: z.string().default(""),
    }),
  ),
});
type BoardJob = z.infer<typeof BoardResponse>["jobs"][number];

const ENTITIES: Readonly<Record<string, string>> = {
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
  "&amp;": "&",
};
const decode = (text: string): string =>
  text.replace(/&(lt|gt|quot|#39|nbsp|amp);/g, (e) => ENTITIES[e] ?? e);

/** Greenhouse sends HTML with entities escaped: decode, drop tags, decode what is left. */
export const htmlToText = (encoded: string): string =>
  decode(decode(encoded).replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

/** A job as the search sees it. */
export type Candidate = JobText & { readonly url: string; readonly updated: string };

export function candidateOf(board: string, job: BoardJob): Candidate {
  return {
    company: JOB_BOARDS[board] ?? board,
    title: job.title,
    location: job.location?.name ?? "",
    department: job.departments.map((d) => d.name).join(", "),
    text: htmlToText(job.content),
    url: job.absolute_url,
    updated: job.updated_at.slice(0, 10),
  };
}

export async function defaultFetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Greenhouse answered ${String(response.status)}`);
  return response.json();
}

/** Fetches (and caches) board jobs; failed boards are reported, not thrown. */
export function boardReader(
  fetchJson: (url: string) => Promise<unknown>,
): (
  boards: readonly string[],
) => Promise<{ failedBoards: { board: string; error: string }[]; candidates: Candidate[] }> {
  const cache = new Map<string, Promise<BoardJob[]>>();
  const read = (board: string): Promise<BoardJob[]> => {
    const cached = cache.get(board);
    if (cached !== undefined) return cached;
    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`;
    const pending = fetchJson(url).then((body) => BoardResponse.parse(body).jobs);
    pending.catch(() => cache.delete(board));
    cache.set(board, pending);
    return pending;
  };
  return async (boards: readonly string[]) => {
    const settled = await Promise.allSettled(boards.map(read));
    return {
      failedBoards: settled.flatMap((r, i) =>
        r.status === "rejected" ? [{ board: boards[i] ?? "", error: String(r.reason) }] : [],
      ),
      candidates: settled.flatMap((r, i) =>
        r.status === "fulfilled" ? r.value.map((job) => candidateOf(boards[i] ?? "", job)) : [],
      ),
    };
  };
}
