import { PromptError, promptProblemLine } from "../components/prompt-problems.js";
import type { AssembledWorkflow } from "../workflow.js";

/** What `gc check --prompts` prints, its exit code and — when it assembled — the workflow. */
export interface PromptCheckReport {
  readonly lines: readonly string[];
  readonly exitCode: 0 | 1;
  readonly bundle?: AssembledWorkflow;
}

/**
 * `gc check --prompts`: assembles the workflow, which reads every prompt (agents, routers, routes)
 * and checks its `{{variables}}` and files — all problems at once, exit code 1 when there is any.
 * Needs no API key.
 */
export async function checkWorkflowPrompts(
  assemble: () => Promise<AssembledWorkflow>,
): Promise<PromptCheckReport> {
  try {
    const bundle = await assemble();
    const count =
      Object.keys(bundle.prompts).length +
      bundle.routers.reduce((sum, router) => sum + 1 + router.routes.length, 0);
    return { lines: [`ok: ${String(count)} prompts render`], exitCode: 0, bundle };
  } catch (error) {
    if (!(error instanceof PromptError)) throw error;
    return {
      lines: [
        `PromptError: ${String(error.problems.length)} prompt problem(s)`,
        ...error.problems.map(promptProblemLine),
      ],
      exitCode: 1,
    };
  }
}
