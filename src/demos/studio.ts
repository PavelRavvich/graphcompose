import "dotenv/config";
import { createAppDeps } from "../app.js";
import { buildGraph } from "../graph/graph.js";
import { companyAssistant, companyAssistantApproval } from "./company-assistant/index.js";
import { jobScout } from "./job-scout/index.js";

const graphOf = async (bundle: Parameters<typeof createAppDeps>[2]) =>
  buildGraph(await createAppDeps(process.env, undefined, bundle));

/** Graphs for LangGraph Studio (`npm run studio`): see langgraph.json. */
export const companyAssistantGraph = await graphOf(companyAssistant);
export const companyAssistantApprovalGraph = await graphOf(companyAssistantApproval);
export const jobScoutGraph = await graphOf(jobScout);
