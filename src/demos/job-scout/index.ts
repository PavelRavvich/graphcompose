/** job-scout demo: resume from disk → interview → Greenhouse search judged by Jev. See Wiki → Demos. */
import { defineBundle } from "../../bundle.js";
import { jobScoutConfig } from "./config.js";
import { jobScoutPrompts } from "./prompts.js";
import { jobSearchConfig } from "./search.config.js";
import { jobScoutTools } from "./tools.js";

export const jobScout = defineBundle({
  config: jobScoutConfig,
  prompts: jobScoutPrompts(jobSearchConfig),
  tools: jobScoutTools,
  mcpServers: [],
});
