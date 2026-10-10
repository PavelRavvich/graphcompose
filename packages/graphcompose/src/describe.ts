import { describeData } from "./cli/describe-data.js";
import { describeWorkflow } from "./cli/describe.js";
import { loadOptions, textOption, workflowPath, type CommandHandler } from "./cli/context.js";
import { loadWorkflow } from "./cli/load-workflow.js";
import { withProfile } from "./profile-workflow.js";

/** `gc describe --workflow <path> [--profile <p>] [--json]` — no API key or network needed. */
export const handle: CommandHandler = async (context) => {
  const profile = textOption(context.values, "profile");
  const workflow = await loadWorkflow(workflowPath(context), loadOptions(context));
  const bundle = await withProfile(workflow, profile, context.io.cwd);
  if (!context.json) {
    describeWorkflow(bundle, profile ?? "base").forEach(context.say);
    return {};
  }
  return { result: describeData(bundle, profile ?? "base") };
};
