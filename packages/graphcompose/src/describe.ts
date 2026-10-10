import { resolve } from "node:path";
import { describeData } from "./cli/describe-data.js";
import { envOption } from "./cli/environment.js";
import { describedEnvironmentFor } from "./environments/load.js";
import { describeWorkflow } from "./cli/describe.js";
import { loadOptions, textOption, workflowPath, type CommandHandler } from "./cli/context.js";
import { loadWorkflow } from "./cli/load-workflow.js";
import { withProfile } from "./profile-workflow.js";

/** `gc describe --workflow <path> [--profile <p>] [--env <name>] [--json]` — no API key or network needed. */
export const handle: CommandHandler = async (context) => {
  const profile = textOption(context.values, "profile");
  const file = workflowPath(context);
  const workflow = await loadWorkflow(file, loadOptions(context));
  const bundle = await withProfile(workflow, profile, context.io.cwd);
  const environment = await describedEnvironmentFor(
    resolve(file),
    envOption(context),
    context.io.env,
  );
  if (!context.json) {
    describeWorkflow(bundle, profile ?? "base", environment).forEach(context.say);
    return {};
  }
  return { result: describeData(bundle, profile ?? "base", environment) };
};
