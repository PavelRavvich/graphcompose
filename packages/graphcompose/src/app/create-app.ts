import type { Class } from "../components/injection.js";
import { workflowOf } from "../components/assemble.js";
import { environmentFor, workflowFileOf } from "../environments/load.js";
import { WorkflowStartText } from "../dto/standard/framework.js";
import { validate } from "../dto/schema.js";
import { workflowStartMetaOf } from "../graph/workflow-start.decorator.js";
import { withProfile } from "../profile-workflow.js";
import { resumeAgent } from "../run/resume-agent.js";
import { runAgent } from "../run/run-agent.js";
import { runVersions } from "../run/versions.js";
import type { AgentExecutionOutput } from "../run/types.js";
import type { AssembledWorkflow } from "../workflow.js";
import { createAppDeps, type AppDeps, type AppDepsOptions } from "./app-deps.js";
import {
  createMemoryPausedRunRepository,
  pausedRunBook,
  type PausedRunRepository,
} from "./paused-runs.js";
import { UnknownToolError } from "./parts.js";
import { cancelledOutcome, LiveRuns, runOptionsOf } from "./live-runs.js";
import {
  flowNodesByKey,
  nestedFlowNodesByKey,
  runResultOf,
  type FlowNodesByKey,
} from "./result.js";
import type { App, ExecutionOutput } from "./types.js";

export class NotAWorkflowStartError extends Error {
  override name = "NotAWorkflowStartError";
}

/** `createApp` options: a profile on top of the workflow, and any part instead of its default. */
export interface AppOptions extends AppDepsOptions {
  /**
   * The environment: `environments/<env>.environment.ts` next to the workflow file (default `dev`);
   * `environment` (values) wins over it.
   */
  readonly env?: string | undefined;
  /** `profiles/<workflow>/<profile>.yaml` under `profileRoot` (default: the working directory). */
  readonly profile?: string | undefined;
  readonly profileRoot?: string;
  /**
   * Where paused runs wait for `resume` (default: in memory, this app only). For runs that survive
   * a restart or a redeploy give `createSqlitePausedRunRepository()` plus a durable checkpointer.
   */
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
  const pathNodes = nestedFlowNodesByKey(bundle.flow);
  const deps = await createAppDeps(bundle, options);
  const paused = pausedRunBook(
    options.pausedRuns ?? createMemoryPausedRunRepository(),
    { workflowVersion: deps.config.version, configHash: runVersions(deps).configHash },
    bundle.onIncompatibleResume,
  );
  const settle = async (run: AgentExecutionOutput): Promise<ExecutionOutput> => {
    await paused.settle(run);
    return runResultOf(run, pathNodes);
  };
  const live = new LiveRuns();
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
      // the thread is known before the run starts, so `cancel(thread)` reaches a new one too
      const thread = call.thread ?? (await deps.terns.createThread(deps.config.name));
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/restrict-template-expressions
      const runId = deps.newRunId?.() || `run-${Date.now()}`;
      const state = { runId, threadId: thread };
      try {
        await deps.observer.onWorkflowStart(state);
        const task = { task: text, start: meta.name, threadId: thread };
        const run = await live.track(thread, call.signal, (signal) =>
          runAgent(task, deps, runOptionsOf(call, signal)),
        );
        const result = await settle(run);
        await deps.observer.onWorkflowEnd(result, state);
        return result;
      } catch (e) {
        await deps.observer.onError(e as Error, state);
        throw e;
      }
    },
    cancel: async (thread) => {
      const running = live.abort(thread);
      const waiting = await paused.drop(thread);
      // a running resume completes its own Tern when the abort stops it
      if (waiting !== undefined && !running) {
        await deps.terns.complete(waiting.ternId, cancelledOutcome(waiting));
      }
      return { cancelled: running || waiting !== undefined };
    },
    resume: async (thread, decision, call = {}) => {
      const run = await paused.resumable(thread);
      return settle(
        await live.track(thread, call.signal, (signal) =>
          resumeAgent(run, decision, deps, runOptionsOf(call, signal)),
        ),
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
  const environment = await environmentFor(
    workflowFileOf(workflow),
    options,
    options.processEnv ?? process.env,
  );
  return (await buildApp(bundle, { ...options, environment })).app;
}
