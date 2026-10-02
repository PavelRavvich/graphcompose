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

export class NotARunnerNodeError extends Error {
  override name = "NotARunnerNodeError";
}

export class UnknownAgentError extends Error {
  override name = "UnknownAgentError";
  constructor(agent: string) {
    super(`Unknown agent: ${agent}`);
  }
}

/** A workflow finish: the answer is the last contribution, checked by the output guards. */
function finishRunner<TName extends string>(deps: GraphDeps<TName>): FlowNodeRunner {
  const outputGuards = makeGuardNode(deps.guards.output, "output");
  return async (state, config) => {
    const answer = lastAnswer(state);
    return { answer, ...(await outputGuards({ ...state, answer }, config)) };
  };
}

/** Each configured agent's own loop, compiled once per graph (approval only with a pause seam). */
function agentLoops<TName extends string>(
  deps: GraphDeps<TName>,
): ReadonlyMap<string, AgentLoopGraph> {
  const approval =
    deps.pause === undefined ? undefined : pauseSeamApproval(deps.pause.needsApproval);
  const runBudgetCap = deps.limits.perRun?.cost ?? Number.POSITIVE_INFINITY;
  return new Map(
    [...agentDefinitions(deps)].map(([name, agent]) => [
      name,
      agentLoopGraph({ agent, bundle: deps.config.name, runBudgetCap, approval, judges: noJudges }),
    ]),
  );
}

/**
 * The runners of the nodes in the flow: a workflow start runs the input guards, an agent runs its
 * own loop (a subgraph: model turns, the move boundary, approval, tool calls), a workflow finish
 * takes the last answer and runs the output guards. Routers are the engine's own.
 */
export function flowRunners<TName extends string>(
  deps: GraphDeps<TName>,
): (node: FlowNodeRef) => FlowNodeRunner {
  const loops = agentLoops(deps);
  const inputGuards = makeGuardNode(deps.guards.input, "input");
  const finish = finishRunner(deps);
  return (node) => {
    switch (node.kind) {
      case "workflow-start":
        return inputGuards;
      case "agent": {
        const loop = loops.get(node.name);
        if (loop === undefined) throw new UnknownAgentError(node.name);
        return agentRunner(loop, node.name);
      }
      case "workflow-finish":
        return finish;
      case "router":
        throw new NotARunnerNodeError(`Router "${node.name}" is run by the flow engine`);
    }
  };
}
