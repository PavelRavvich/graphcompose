import type { RunnableConfig } from "@langchain/core/runnables";
import { WorkflowCancelledError } from "../core/errors.js";
import type { Class } from "../components/injection.js";
import type { ActionRuntime, IWorkflowAction } from "../components/decorators.js";
import { componentOf } from "../components/metadata.js";
import { agentRunner, type AgentLoopGraph } from "./agent-loop/index.js";
import type { GraphDeps } from "./deps.js";
import type { FlowNodeRef } from "./flow-nodes.js";
import { collectFlow } from "./flow-nodes.js";
import type { RunLimits } from "./flow-runtime.js";
import type { FlowStateType } from "./flow-state.js";
import { childInputOf } from "./nested-workflow.js";
import type { WorkflowMeta } from "../components/meta-types.js";
import type { FlowNodeRunner } from "./visit.js";

export class UnknownActionError extends Error {
  override name = "UnknownActionError";
}

/** The run id from LangGraph's config (`configurable` is typed as a record of `any`). */
const configuredRunId = (config?: RunnableConfig): string =>
  (config?.configurable?.runId ?? "") as string;

type RunCompensation = (
  compClass: Class,
  childState: FlowStateType,
  nodeName?: string,
) => Promise<unknown>;

/** The config a compensating workflow runs with: the action's thread, in a namespace of its own. */
const compensationConfig = (config: RunnableConfig | undefined, name: string): RunnableConfig => {
  const ns = (config?.configurable?.checkpoint_ns ?? "") as string;
  const own = `compensate.${name}`;
  return {
    ...config,
    configurable: { ...config?.configurable, checkpoint_ns: ns === "" ? own : `${ns}|${own}` },
  };
};

/** A compensating `@Workflow`: its OWN flow (not the parent's), run as a subgraph of the action. */
async function runCompensatingWorkflow<TName extends string>(
  deps: GraphDeps<TName>,
  run: RunLimits,
  workflow: WorkflowMeta,
  state: FlowStateType,
  config: RunnableConfig | undefined,
): Promise<FlowStateType> {
  // flowGraphOf is in flow-runtime.ts, which imports this file: imported inline (cycle).
  const { flowGraphOf } = await import("./flow-runtime.js");
  const own = await flowGraphOf({ ...deps, flow: workflow.flow }, run);
  return own.graph.invoke(childInputOf(state), compensationConfig(config, workflow.name));
}

/** Runs a compensating component (an action, an agent or a workflow) for a SAGA rollback. */
function compensationRunner<TName extends string>(
  deps: GraphDeps<TName>,
  run: RunLimits,
  loops: ReadonlyMap<string, AgentLoopGraph>,
  runId: string,
  config: RunnableConfig | undefined,
): RunCompensation {
  const getComponentClass = (nodeName: string): Class | undefined =>
    collectFlow(deps.flow).nodes.get(nodeName)?.use;

  const runCompensation: RunCompensation = async (compClass, childState, nodeName) => {
    const comp = componentOf(compClass);
    if (!comp) throw new Error(`Component not found for compensation class`);

    if (comp.kind === "action") {
      if (!deps.actions) throw new Error("Actions not wired");
      const act = deps.actions(comp.meta.name);
      const ctx: ActionRuntime = {
        runId,
        signal: config?.signal,
        getComponentClass,
        runCompensation,
        idempotencyKey: nodeName ? `run_${runId}_node_${nodeName}` : undefined,
      };
      return await act.execute(childState, ctx);
    }
    if (comp.kind === "agent") {
      const loop = loops.get(comp.meta.name);
      if (!loop) throw new Error(`Agent loop not found for ${comp.meta.name}`);
      return await agentRunner(loop, comp.meta.name)(childState, config);
    }
    if (comp.kind === "workflow") {
      return runCompensatingWorkflow(deps, run, comp.meta, childState, config);
    }
    throw new Error(`Unsupported compensation kind: ${comp.kind}`);
  };
  return runCompensation;
}

/** A `@WorkflowAction` node: its `execute` with the run's context (compensation included). */
export function actionRunner<TName extends string>(
  deps: GraphDeps<TName>,
  run: RunLimits,
  loops: ReadonlyMap<string, AgentLoopGraph>,
  node: FlowNodeRef,
): FlowNodeRunner {
  // The lookup may miss at runtime, whatever its declared type says.
  const actions: ((name: string) => IWorkflowAction | undefined) | undefined = deps.actions;
  if (!actions) throw new Error("Workflow actions not wired in RunDeps");
  const action = actions(node.name);
  if (!action) throw new UnknownActionError(`Unknown action: ${node.name}`);

  return async (state, config) => {
    if (state.cancelRequested) {
      throw new WorkflowCancelledError();
    }
    const runId = configuredRunId(config);
    const runCompensation = compensationRunner(deps, run, loops, runId, config);
    const executionContext: unknown = config?.configurable?.executionContext;
    const context: ActionRuntime = {
      runId,
      idempotencyKey: `run_${runId}_node_${node.name}`,
      signal: config?.signal,
      getComponentClass: (nodeName: string) => collectFlow(deps.flow).nodes.get(nodeName)?.use,
      runCompensation,
      executionContext,
      item: state.batchItem,
    };

    const appState = { runId, activeNode: node.name };
    await deps.observer?.onActionStart({ name: node.name, input: state, state: appState });
    const result = await action.execute(state, context);
    await deps.observer?.onActionEnd({ name: node.name, update: result, state: appState });
    return result;
  };
}
