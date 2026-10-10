import {
  loadOptions,
  requiredText,
  textOption,
  workflowPath,
  type CommandContext,
  type CommandHandler,
} from "../cli/context.js";
import { cliEnvironment } from "../cli/environment.js";
import { usageError } from "../cli/errors.js";
import { loadWorkflow } from "../cli/load-workflow.js";
import type { AppDeps } from "../app/app-deps.js";
import { compareBundleProfiles } from "./compare-profiles.js";
import { formatComparison } from "./compare-report.js";
import { goldenFile, loadGolden } from "./golden.js";

async function tasksOf(context: CommandContext, base: AppDeps): Promise<string[]> {
  const golden = textOption(context.values, "golden");
  if (golden === undefined) {
    const last = Number(requiredText(context.values, "last"));
    return (await base.terns.recentOriginals(base.config.name, last)).map((t) => t.task);
  }
  const set = await loadGolden(goldenFile(context.io.cwd, base.config.name, golden));
  return set.tasks.map((t) => t.task);
}

/** `gc compare --workflow <path> --profiles base,<p>… [--golden <name> | --last N]` (`compareProfiles`). */
export const compareProfiles: CommandHandler = async (context) => {
  const names = requiredText(context.values, "profiles")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name !== "");
  if (names.length < 2)
    throw usageError(
      "compare",
      "usage.option-value",
      "--profiles needs at least two, e.g. base,<profile>",
    );
  const file = workflowPath(context);
  const bundle = await loadWorkflow(file, loadOptions(context));
  const environment = await cliEnvironment(context, file);
  const comparison = await compareBundleProfiles(
    bundle,
    names,
    {
      processEnv: context.io.env,
      profileRoot: context.io.cwd,
      ...(environment === undefined ? {} : { environment }),
    },
    (base) => tasksOf(context, base),
  );
  comparison.warnings.forEach((warning) => {
    context.warn(`warning: ${warning}`);
  });
  formatComparison(comparison.tasks, comparison.profiles).forEach(context.say);
  return { result: { tasks: comparison.tasks, profiles: comparison.profiles } };
};
