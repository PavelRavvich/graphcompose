import { checkModelUses } from "../models/check.js";
import { problemLine } from "../models/problems.js";
import { modelUsesOf } from "../models/uses.js";
import { directoryOf, modelSummaryOf } from "../models/workflow-models.js";
/**
 * `gc check --models`: every model setting of the workflow against what its provider says the model
 * supports — all problems at once, exit code 1 when there is any. Needs no API key.
 */
export async function checkWorkflowModels(bundle, env, send) {
    const directory = directoryOf(bundle.models);
    const uses = modelUsesOf(bundle.config, bundle.routers);
    const problems = await checkModelUses(uses, directory, {
        env,
        ...(send === undefined ? {} : { send }),
    });
    if (problems.length === 0) {
        return {
            lines: [
                ...modelSummaryOf(uses, directory),
                `ok: ${String(uses.length)} model settings fit their models`,
            ],
            exitCode: 0,
        };
    }
    return {
        lines: [
            `ConfigurationError: ${String(problems.length)} model setting(s) do not fit their models`,
            ...problems.map((problem) => `  ${problemLine(problem)}`),
        ],
        exitCode: 1,
    };
}
