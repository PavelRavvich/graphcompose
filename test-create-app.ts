import { createApp } from "./packages/graphcompose/src/app/create-app.js";
import { JobScout } from "./examples/job-scout/src/job-scout.workflow.js";

process.env.OPENROUTER_API_KEY = "dummy";
const app = await createApp(JobScout, { 
  skipModelChecks: true,
  connectMcp: async () => ({ close: async () => undefined } as any)
});
const deps = (app as any).deps;
console.log(deps.toolPiiPolicies("t1"));
