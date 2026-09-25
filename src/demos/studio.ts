import "dotenv/config";
import { createAppDeps } from "../app.js";
import { bundleOf, type Class } from "../components/index.js";
import { studioGraph } from "../graph/studio-graph.js";
import {
  CompanyAssistant,
  CompanyAssistantApproval,
} from "./company-assistant/company-assistant.bundle.js";
import { JobScout } from "./job-scout/job-scout.bundle.js";

const graphOf = async (bundle: Class) =>
  studioGraph(await createAppDeps(process.env, undefined, await bundleOf(bundle)));

/** Graphs for LangGraph Studio (`npm run studio`): see langgraph.json. */
export const companyAssistantGraph = await graphOf(CompanyAssistant);
export const companyAssistantApprovalGraph = await graphOf(CompanyAssistantApproval);
export const jobScoutGraph = await graphOf(JobScout);
