import "dotenv/config";
import { parseArgs } from "node:util";
import { checkWorkflowModels } from "./cli/check-models.js";
import { loadWorkflow } from "./cli/load-workflow.js";
import { withProfile } from "./profile-workflow.js";

// graphcompose check --models --workflow <path> [--profile <p>] — no API key needed.
const { values } = parseArgs({
  options: {
    models: { type: "boolean", default: false },
    workflow: { type: "string", default: "./src/workflow.ts" },
    profile: { type: "string" },
  },
});
if (!values.models) {
  process.stderr.write("gc check: say what to check — --models\n");
  process.exitCode = 1;
} else {
  const bundle = await withProfile(await loadWorkflow(values.workflow), values.profile);
  const report = await checkWorkflowModels(bundle, process.env);
  report.lines.forEach((line) => process.stdout.write(`${line}\n`));
  process.exitCode = report.exitCode;
}
