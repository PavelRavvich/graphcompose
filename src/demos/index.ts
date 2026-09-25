/**
 * All demos, one folder each (Wiki → Demos). Remove the demos: delete src/demos/, its import line
 * in src/bundles.ts and the demo graphs in langgraph.json.
 */
import type { AgentBundle } from "../bundle.js";
import { companyAssistant, companyAssistantApproval } from "./company-assistant/index.js";
import { jobScout } from "./job-scout/index.js";

export const demoBundles: Readonly<Record<string, AgentBundle>> = {
  "company-assistant": companyAssistant,
  "company-assistant-approval": companyAssistantApproval,
  "job-scout": jobScout,
};
