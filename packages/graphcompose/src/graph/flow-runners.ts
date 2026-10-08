/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */

import { agentDefinitions } from "./agent-definitions.js";
import {
  agentLoopGraph,
  agentRunner,
  noJudges,
  pauseSeamApproval,
  type AgentLoopGraph,
} from "./agent-loop/index.js";
import type { GraphDeps } from "./deps.js";
import type { FlowNodeRef } from "./flow-nodes.js";
import { lastAnswer } from "./nodes/finalize.js";
import { makeGuardNode } from "./nodes/guards.js";
import type { FlowNodeRunner } from "./visit.js";
import type { MultimodalFinishOutput } from "../app/types.js";

import { componentOf } from "../components/metadata.js";
import type { WorkflowMeta } from "../components/meta-types.js";
import type { WorkflowDefinition } from "./settings.js";

class NotARunnerNodeError extends Error {
  override name = "NotARunnerNodeError";
}

export class UnknownActionError extends Error {
  override name = "UnknownActionError";
}

class UnknownAgentError extends Error {
  override name = "UnknownAgentError";
  constructor(agent: string) {
    super(`Unknown agent: ${agent}`);
  }
}

/** A workflow finish: the answer is the last contribution, checked by the output guards. */
function finishRunner<TName extends string>(deps: GraphDeps<TName>, name: string): FlowNodeRunner {
  const outputGuards = makeGuardNode(deps.guards.output, "output");
  return async (state, config) => {
    const answer = lastAnswer(state);
    const guarded = await outputGuards({ ...state, answer }, config);
    const finishOutput: MultimodalFinishOutput = {
      kind: "multimodal",
      blocks: Array.isArray(state.contributions.at(-1)?.content)
        ? (state.contributions.at(-1)?.content as any)
        : [],
    };
    return { answer, finishes: { [name]: finishOutput }, ...guarded };
  };
}

/** Each configured agent's own loop, compiled once per graph (approval only with a pause seam). */
function agentLoops<TName extends string>(
  deps: GraphDeps<TName>,
): ReadonlyMap<string, AgentLoopGraph> {
  const approval =
    deps.pause === undefined
      ? undefined
      : pauseSeamApproval(deps.requestApproval, deps.channelAdapters, deps.observer);
  const runBudgetCap = deps.limits.perRun?.cost ?? Number.POSITIVE_INFINITY;
  return new Map(
    [...agentDefinitions(deps)].map(([name, agent]) => [
      name,
      agentLoopGraph(
        {
          agent,
          bundle: deps.config.name,
          runBudgetCap,
          approval,
          judges: noJudges,
          piiPolicies: deps.piiPolicies?.(name),
          guardrails: deps.guardrails?.(name),
          observer: deps.observer,
        },
        deps.pause?.checkpointer,
      ),
    ]),
  );
}

/**
 * The runners of the nodes in the flow: a workflow start runs the input guards, an agent runs its
 * own loop (a subgraph: model turns, the move boundary, approval, tool calls), a workflow finish
 * takes the last answer and runs the output guards. Routers are the engine's own.
 */
import type { RunLimits } from "./flow-runtime.js";
export function flowRunners<TName extends string>(
  deps: GraphDeps<TName>,
  run: RunLimits,
): (node: FlowNodeRef) => FlowNodeRunner {
  const loops = agentLoops(deps);
  const inputGuards = makeGuardNode(deps.guards.input, "input");

  return (node) => {
    switch (node.kind) {
      case "quorumRouter":
      case "router":
        return undefined as any;
      case "workflow-start":
        return inputGuards;
      case "action": {
        if (!deps.actions) throw new Error("Workflow actions not wired in RunDeps");
        const action = deps.actions(node.name);
        if (!action) throw new UnknownActionError(`Unknown action: ${node.name}`);
        return async (state, config) => {
          const context = { runId: config?.configurable?.runId ?? "", signal: config?.signal };
          const appState = { runId: config?.configurable?.runId ?? "", activeNode: node.name };
          await deps.observer?.onActionStart({ name: node.name, input: state, state: appState });
          const result = await action.execute(state, context);
          await deps.observer?.onActionEnd({ name: node.name, update: result, state: appState });
          return result;
        };
      }
      case "workflow": {
        const component = componentOf(node.use);
        if (!component || component.kind !== "workflow")
          throw new Error(`Not a workflow: ${node.name}`);

        return async (state, config) => {
          const runId = state.runId;
          const appState = { runId, activeNode: node.name, variables: {}, history: state.history };
          await deps.observer?.onActionStart({ name: node.name, input: state, state: appState });

          const meta = component.meta as WorkflowMeta;
          const WorkflowClass = node.use as new () => WorkflowDefinition;
          const mock = deps.mockedWorkflows?.get(node.use);
          if (mock) {
            const mockResult = await mock(state, config);
            await deps.observer?.onActionEnd({ name: node.name, update: mockResult || {}, state: appState });
            return mockResult || {};
          }
          const instance = new WorkflowClass();
          const localSettings = instance.settings ? instance.settings() : {};

          // Create sub-dependencies inheriting from parent but overriding flow
          const subDeps: GraphDeps<TName> = {
            ...deps,
            flow: meta.flow,
            // Ideally we'd merge localSettings.limits into subDeps.limits here,
            // but for now we rely on the global ledger.
          };

          // Re-import flowGraphOf dynamically or use a passed reference to avoid circular dependency
          // Wait, flowGraphOf is in flow-runtime.ts, which calls this file. Circular dependency!
          // We can require it inline.
          const { flowGraphOf } = await import("./flow-runtime.js");
          const flow = await flowGraphOf(subDeps, {
            limits: deps.limits,
            spentToday: run.spentToday,
          });

          const childState = {
            ...state,
            steps: 0,
            path: [],
            visits: {},
            forks: {},
            _batchCursor: {},
          };

          const result = await flow.graph.invoke(childState, config);

          await deps.observer?.onActionEnd({ name: node.name, update: result, state: appState });

          return {
            payload: result.payload,
            contributions: result.contributions,
            steps: result.steps,
          };
        };
      }

      case "agent": {
        const loop = loops.get(node.name);
        if (loop === undefined) throw new UnknownAgentError(node.name);
        const runner = agentRunner(loop, node.name);
        return async (state, config) => {
          const runId = state.runId;
          const appState = { runId, activeNode: node.name, variables: {}, history: state.history };
          await deps.observer?.onAgentStart({
            name: node.name,
            input: state.task,
            state: appState,
          });
          try {
            const result = await runner(state, config);
            await deps.observer?.onAgentEnd({ name: node.name, update: result, state: appState });
            return result;
          } catch (e: any) {
            if (e && (e.name === "NodeInterrupt" || e.name === "GraphInterrupt")) throw e; // Let pauses bubble up
            if (state.optionalBranches?.includes(node.name)) {
              // Supress error for optional branches
              await deps.observer?.onError(e, appState);
              return {};
            }
            throw e;
          }
        };
      }
      case "workflow-finish":
        return finishRunner(deps, node.name);
    }
  };
}
