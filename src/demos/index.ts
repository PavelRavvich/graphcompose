/**
 * All demos, one folder each (Wiki → Demos). Remove the demos: delete src/demos/, its import line
 * in src/bundles.ts and the demo graphs in langgraph.json.
 */
import type { Class } from "../components/index.js";
import {
  CompanyAssistant,
  CompanyAssistantApproval,
} from "./company-assistant/company-assistant.bundle.js";
import { JobScout } from "./job-scout/job-scout.bundle.js";

export const demoBundles: Readonly<Record<string, Class>> = {
  "company-assistant": CompanyAssistant,
  "company-assistant-approval": CompanyAssistantApproval,
  "job-scout": JobScout,
};
