import { createAppDeps, type AppDeps } from "../app/app-deps.js";
import { loadOptions, textOption, workflowPath, type CommandContext } from "../cli/context.js";
import { loadEnvironment, loadWorkflow } from "../cli/load-workflow.js";
import { withProfile } from "../profile-workflow.js";

/** The app parts of the workflow with a profile (eval, replay, golden and compare use them). */
export async function depsFor(
  context: CommandContext,
  profile: string | undefined,
): Promise<AppDeps> {
  const file = workflowPath(context);
  const env: unknown = await loadEnvironment(file, textOption(context.values, "env"));
  const deps = await createAppDeps(
    await withProfile(await loadWorkflow(file, loadOptions(context)), profile, context.io.cwd),
    { env: env as NodeJS.ProcessEnv },
  );
  deps.warnings.forEach((warning) => {
    context.warn(`warning: ${warning}`);
  });
  return deps;
}
