import { workflowOf } from "../components/assemble.js";
import { WorkflowStartText } from "../dto/standard/framework.js";
import { validate } from "../dto/schema.js";
import { workflowStartMetaOf } from "../graph/workflow-start.decorator.js";
import { withProfile } from "../profile-workflow.js";
import { resumeAgent, NotPausedError } from "../run/resume-agent.js";
import { runAgent } from "../run/run-agent.js";
import { createAppDeps } from "./app-deps.js";
import { createMemoryPausedRunRepository } from "./paused-runs.js";
import { flowNodesByKey, runResultOf } from "./result.js";
export class NotAWorkflowStartError extends Error {
    name = "NotAWorkflowStartError";
}
const startsOf = (nodes) => [...nodes.values()].filter((node) => typeof node === "function" && workflowStartMetaOf(node) !== undefined);
/** The start a plain text goes to: the one taking `WorkflowStartText`, else the first one. */
const textStartOf = (nodes) => {
    const starts = startsOf(nodes);
    return (starts.find((start) => workflowStartMetaOf(start)?.input === WorkflowStartText) ?? starts[0]);
};
function startMetaOf(start, nodes, workflow) {
    const meta = workflowStartMetaOf(start);
    if (meta === undefined || !startsOf(nodes).includes(start)) {
        throw new NotAWorkflowStartError(`${start.name} is not a workflow start of "${workflow}"`);
    }
    return meta;
}
/** The app over already assembled parts (a profile applied, test replacements given). */
export async function buildApp(bundle, options = {}) {
    const nodes = flowNodesByKey(bundle.flow);
    const deps = await createAppDeps(bundle, options);
    const paused = options.pausedRuns ?? createMemoryPausedRunRepository();
    const settle = (run) => {
        if (run.status === "paused")
            paused.set(run);
        else
            paused.delete(run.threadId);
        return runResultOf(run, nodes);
    };
    let closed = false;
    const app = {
        name: deps.config.name,
        version: deps.config.version,
        warnings: deps.warnings,
        models: deps.models,
        textStart: textStartOf(nodes),
        execute: async (start, input, call = {}) => {
            const meta = startMetaOf(start, nodes, deps.config.name);
            const { text } = validate(meta.input, input);
            const thread = call.thread === undefined ? {} : { threadId: call.thread };
            const task = { task: text, start: meta.name, ...thread };
            const runId = deps.newRunId?.() || `run-${Date.now()}`;
            const state = { runId, threadId: call.thread };
            try {
                await deps.observer.onWorkflowStart(state);
                const result = settle(await runAgent(task, deps, {
                    signal: call.signal,
                    executionContext: call.executionContext,
                }));
                await deps.observer.onWorkflowEnd(result, state);
                return result;
            }
            catch (e) {
                await deps.observer.onError(e, state);
                throw e;
            }
        },
        resume: async (thread, decision, call = {}) => {
            const run = paused.get(thread);
            if (run === undefined)
                throw new NotPausedError(`Thread "${thread}" has no paused run`);
            return settle(await resumeAgent(run, decision, deps, {
                signal: call.signal,
                executionContext: call.executionContext,
            }));
        },
        close: async () => {
            if (closed)
                return;
            closed = true;
            await deps.close();
        },
    };
    return { app, deps, bundle, nodes };
}
/**
 * Builds a workflow into an app: the container, the graph (every assembly error at once), the
 * components' `onStart` hooks — `const app = await createApp(JobScout)`; then
 * `app.execute(ChatWorkflowStart, { text })`, `app.resume(thread, decision)`, `app.close()`.
 */
export async function createApp(workflow, options = {}) {
    const bundle = await withProfile(await workflowOf(workflow), options.profile, options.profileRoot);
    return (await buildApp(bundle, options)).app;
}
