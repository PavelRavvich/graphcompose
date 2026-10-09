import { createAppDeps } from "./packages/graphcompose/src/app/app-deps.js";
const bundle = {
  config: { agents: {}, routers: {}, defaults: { models: {}, router: "" } },
  knowledge: () => ({}),
  piiPolicies: () => new Map(),
  workflowPiiPolicies: () => [],
  workflowGuardrails: () => [],
  guardrails: () => new Map(),
  toolPiiPolicies: () => new Map(),
  toolGuardrails: () => new Map(),
};
const deps = await createAppDeps(bundle, {}, {}, {}, { newRunId: () => "run1" });
console.log(deps.toolPiiPolicies("test"));
