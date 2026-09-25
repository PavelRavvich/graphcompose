/** job-scout demo: resume from disk → interview → Greenhouse search judged by Jev. See Wiki → Demos. */
import { defineBundle } from "../../bundle.js";
import { jobScoutConfig } from "./config.js";
import { routerFitJudge } from "./fit.js";
import { createGreenhouseTool } from "./greenhouse.js";
import { jobScoutPrompts } from "./prompts.js";
import { createReadResumeTool } from "./resume.js";

export const jobScout = defineBundle({
  config: jobScoutConfig,
  prompts: jobScoutPrompts,
  tools: ({ router }) => [
    createReadResumeTool(),
    createGreenhouseTool({ judge: routerFitJudge(router("job-fit")) }),
  ],
  mcpServers: [],
});
