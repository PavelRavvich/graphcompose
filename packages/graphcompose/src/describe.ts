import { parseArgs } from "node:util";
import { loadWorkflow } from "./cli/load-workflow.js";
import { describeWorkflow } from "./cli/describe.js";
import { withProfile } from "./profile-workflow.js";

// graphcompose describe --workflow <path> [--profile <p>] — no API key or network needed.
const { values } = parseArgs({
  options: {
    workflow: { type: "string", default: "./src/workflow.ts" },
    profile: { type: "string" },
  },
});
const bundle = await withProfile(await loadWorkflow(values.workflow), values.profile);
describeWorkflow(bundle, values.profile ?? "base").forEach((line) =>
  process.stdout.write(`${line}\n`),
);
