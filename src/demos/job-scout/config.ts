import { agentsConfig } from "../../config/agents.config.js";
import type { AgentsConfigOf } from "../../config/types.js";

const { price } = agentsConfig.agents.researcher;

/** job-scout: resume from disk → interview → Greenhouse search judged by Jev, in a chat loop. */
export const jobScoutConfig = {
  name: "job-scout",
  defaults: { ...agentsConfig.defaults, history: { limit: 8 } },
  budget: { ...agentsConfig.budget, runBudgetCap: 0.1 },
  routers: agentsConfig.routers,
  guards: agentsConfig.guards,
  compaction: {
    every: 5,
    keep: 10,
    model: { model: "moonshotai/kimi-k2.6", thinking: "none", price },
  },
  agents: {
    profiler: {
      model: "moonshotai/kimi-k2.6",
      description:
        "Reads the user's resume, interviews them about the jobs they want and agrees a search brief",
      tools: ["read_resume"],
      price,
    },
    scout: {
      model: "moonshotai/kimi-k2.6",
      description:
        "Searches Greenhouse with the agreed search brief and returns the best-fitting jobs with links",
      tools: ["greenhouse_jobs"],
      // ranking is Jev's job; the scout only filters and formats — no reasoning to pay for
      thinking: "none",
      price,
    },
  },
} as const satisfies AgentsConfigOf<string, "read_resume" | "greenhouse_jobs">;

export type JobScoutAgent = keyof typeof jobScoutConfig.agents;
