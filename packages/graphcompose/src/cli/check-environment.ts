import { resolve } from "node:path";
import { ComponentError } from "../components/metadata.js";
import { environmentFor } from "../environments/load.js";
import { EnvironmentError } from "../environments/resolve.js";
import { resolveTools, type AssembledWorkflow } from "../workflow.js";
import type { CheckProblem } from "./check-problems.js";
import { describeServices } from "./describe.js";

/** What the environment check reads: the workflow, the `--env` name and the process env. */
export interface EnvironmentTarget {
  readonly file: string;
  readonly bundle: AssembledWorkflow;
  readonly envName: string | undefined;
  readonly env: NodeJS.ProcessEnv;
}

const problemOf = (file: string, error: unknown): CheckProblem[] => {
  if (error instanceof EnvironmentError)
    return [{ file, code: error.code, message: error.message }];
  if (error instanceof ComponentError && error.message.startsWith("[di.missing-environment]"))
    return [{ file, code: "di.missing-environment", message: error.message }];
  throw error;
};

/**
 * `gc check` without running anything: the selected environment is found and every `fromEnv` variable
 * it needs is set; with no environment, no tool injects `ENV`.
 */
export async function environmentProblems(target: EnvironmentTarget): Promise<CheckProblem[]> {
  try {
    const environment = await environmentFor(
      resolve(target.file),
      { env: target.envName },
      target.env,
    );
    const { router } = describeServices;
    resolveTools(target.bundle, { router, ...(environment === undefined ? {} : { environment }) });
    return [];
  } catch (error) {
    return problemOf(target.file, error);
  }
}
