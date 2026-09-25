import type { BundleServices } from "../../bundle.js";
import { routerFitJudge } from "./fit.js";
import { createGreenhouseTool, type GreenhouseTool } from "./greenhouse.js";
import { createReadResumeTool, type ReadResumeTool } from "./resume.js";
import { jobSearchConfig } from "./search.config.js";

/** job-scout's tool catalog; which agent may use which tool is in config.ts (`tools:`). */
export const jobScoutTools = ({
  router,
}: BundleServices): readonly [ReadResumeTool, GreenhouseTool] => [
  createReadResumeTool(),
  createGreenhouseTool({ judge: routerFitJudge(router("job-fit")), search: jobSearchConfig }),
];

/** Tool names derived from the catalog — a new tool is known to the config's type automatically. */
export type JobScoutToolName = ReturnType<typeof jobScoutTools>[number]["name"];
