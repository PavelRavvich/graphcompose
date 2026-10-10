import type { Class } from "../components/injection.js";
import { workflowOf } from "../components/assemble.js";
import { WorkflowStartText } from "../dto/standard/framework.js";
import { validate } from "../dto/schema.js";
import { workflowStartMetaOf } from "../graph/workflow-start.decorator.js";
import { withProfile } from "../profile-workflow.js";
import { resumeAgent, NotPausedError } from "../run/resume-agent.js";
import { runAgent } from "../run/run-agent.js";
import type { AgentExecutionOutput } from "../run/types.js";
import type { AssembledWorkflow } from "../workflow.js";
import { createAppDeps, type AppDeps, type AppDepsOptions } from "./app-deps.js";
import { createMemoryPausedRunRepository, type PausedRunRepository } from "./paused-runs.js";
import { UnknownToolError } from "./parts.js";
import { flowNodesByKey, runResultOf, type FlowNodesByKey } from "./result.js";
import type { App, ExecutionOutput } from "./types.js";

export class NotAWorkflowStartError extends Error {
  override name = "NotAWorkflowStartError";
}

/** `createApp` options: a profile on top of the workflow, and any part instead of its default. */
export interface AppOptions extends AppDepsOptions {
  /** `profiles/<workflow>/<profile>.yaml` under `profileRoot` (default: the working directory). */
  readonly profile?: string | undefined;
  readonly profileRoot?: string;
  /** Where paused runs wait for `resume` (default: in memory, this app only). */
  readonly pausedRuns?: PausedRunRepository;
}

/** An app with the parts it was built from (the testing toolkit's slices read them). */
export interface BuiltApp {
  readonly app: App;
  readonly deps: AppDeps;
  readonly bundle: AssembledWorkflow;
  readonly nodes: FlowNodesByKey;
}

const startsOf = (nodes: FlowNodesByKey): Class[] =>
  [...nodes.values()].filter(
    (node): node is Class => typeof node === "function" && workflowStartMetaOf(node) !== undefined,
  );

/** The start a plain text goes to: the one taking `WorkflowStartText`, else the first one. */
const textStartOf = (nodes: FlowNodesByKey): Class | undefined => {
  const starts = startsOf(nodes);
  return (
    starts.find((start) => workflowStartMetaOf(start)?.input === WorkflowStartText) ?? starts[0]
  );
};

function startMetaOf(start: Class, nodes: FlowNodesByKey, workflow: string) {
  const meta = workflowStartMetaOf(start);
  if (meta === undefined || !startsOf(nodes).includes(start)) {
    throw new NotAWorkflowStartError(`${start.name} is not a workflow start of "${workflow}"`);
  }
  return meta;
}

/** The app over already assembled parts (a profile applied, test replacements given). */
// eslint-disable-next-line max-lines-per-function
export async function buildApp(
  bundle: AssembledWorkflow,
  options: AppOptions = {},
): Promise<BuiltApp> {
  const nodes = flowNodesByKey(bundle.flow);
  const deps = await createAppDeps(bundle, options);
  const paused = options.pausedRuns ?? createMemoryPausedRunRepository();
  const settle = (run: AgentExecutionOutput): ExecutionOutput => {
    if (run.status === "paused") paused.set(run);
    else paused.delete(run.threadId);
    return runResultOf(run, nodes);
  };
  let closed = false;
  const app: App = {
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
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/restrict-template-expressions
      const runId = deps.newRunId?.() || `run-${Date.now()}`;
      const state = { runId, threadId: call.thread };

      try {
        await deps.observer.onWorkflowStart(state);
        const result = settle(
          await runAgent(task, deps, {
            signal: call.signal,
            executionContext: call.executionContext,
          }),
        );
        await deps.observer.onWorkflowEnd(result, state);
        return result;
      } catch (e) {
        await deps.observer.onError(e as Error, state);
        throw e;
      }
    },
    cancel: async (thread) => {
      // If the app is currently paused, resuming it with a dummy value will cause it to wake up
      // and immediately throw WorkflowCancelledError because of the pre-execution guard.
      if (paused.get(thread) !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        await app.resume(thread, null).catch(() => {});
      }
    },
    resume: async (thread, decision, call = {}) => {
      const run = paused.get(thread);
      if (run === undefined) throw new NotPausedError(`Thread "${thread}" has no paused run`);
      return settle(
        await resumeAgent(run, decision, deps, {
          signal: call.signal,
          executionContext: call.executionContext,
        }),
      );
    },
    close: async () => {
      if (closed) return;
      closed = true;
      await deps.close();
    },
    resolve: (token) => {
      if (!deps.container) throw new Error("Container is not available");
      return deps.container.get(token);
    },
    hasTool: (name) => {
      try {
        deps.tools(name);
        return true;
      } catch (error) {
        if (error instanceof UnknownToolError) return false;
        throw error;
      }
    },
  };
  return { app, deps, bundle, nodes };
}

/**
 * Builds a workflow into an app: the container, the graph (every assembly error at once), the
 * components' `onStart` hooks — `const app = await createApp(JobScout)`; then
 * `app.execute(ChatWorkflowStart, { text })`, `app.resume(thread, decision)`, `app.close()`.
 */
export async function createApp(workflow: Class, options: AppOptions = {}): Promise<App> {
  const bundle = await withProfile(
    await workflowOf(workflow),
    options.profile,
    options.profileRoot,
  );
  return (await buildApp(bundle, options)).app;
}
