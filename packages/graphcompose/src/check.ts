import "dotenv/config";
import { parseArgs } from "node:util";
import { checkWorkflowModels } from "./cli/check-models.js";
import { checkWorkflowPrompts } from "./cli/check-prompts.js";
import { loadWorkflow } from "./cli/load-workflow.js";
import { withProfile } from "./profile-workflow.js";

// graphcompose check [--prompts] [--models] --workflow <path> [--profile <p>] — no API key needed.
const { values } = parseArgs({
  options: {
    models: { type: "boolean", default: false },
    prompts: { type: "boolean", default: false },
    workflow: { type: "string", default: "./src/workflow.ts" },
    profile: { type: "string" },
  },
});
const print = (lines: readonly string[]): void => {
  lines.forEach((line) => process.stdout.write(`${line}\n`));
};
if (!values.models && !values.prompts) {
  process.stderr.write("gc check: say what to check — --prompts, --models\n");
  process.exitCode = 1;
} else {
  // assembling reads and checks every prompt, so --models stops on prompt problems too
  const prompts = await checkWorkflowPrompts(async () =>
    withProfile(await loadWorkflow(values.workflow), values.profile),
  );
  if (values.prompts || prompts.bundle === undefined) print(prompts.lines);
  process.exitCode = prompts.exitCode;
  if (values.models && prompts.bundle !== undefined) {
    const report = await checkWorkflowModels(prompts.bundle, process.env);
    print(report.lines);
    process.exitCode = report.exitCode;
  }
}
