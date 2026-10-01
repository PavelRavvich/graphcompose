import { agentDefinitions } from "./agent-definitions.js";
import type { GraphDeps } from "./deps.js";
import type { FlowNodeRef } from "./flow-nodes.js";
import { agentLoopGraph, agentRunner } from "./nodes/agent-loop.js";
import { lastAnswer } from "./nodes/finalize.js";
import { makeGuardNode } from "./nodes/guards.js";
import type { FlowNodeRunner } from "./visit.js";

export class NotARunnerNodeError extends Error {
  override name = "NotARunnerNodeError";
}

/** A workflow finish: the answer is the last contribution, checked by the output guards. */
function finishRunner<TName extends string>(deps: GraphDeps<TName>): FlowNodeRunner {
  const outputGuards = makeGuardNode(deps.guards.output, "output");
  return async (state, config) => {
    const answer = lastAnswer(state);
    return { answer, ...(await outputGuards({ ...state, answer }, config)) };
  };
}

/**
 * The runners of the existing nodes in the flow (until #119 / #120 replace them): a workflow start runs
 * the input guards, an agent runs its loop (approval pause, knowledge), a workflow finish takes the last answer
 * and runs the output guards. Routers are the engine's own.
 */
export function flowRunners<TName extends string>(
  deps: GraphDeps<TName>,
): (node: FlowNodeRef) => FlowNodeRunner {
  const loop = agentLoopGraph(
    {
      agents: agentDefinitions(deps),
      bundle: deps.config.name,
      runBudgetCap: deps.limits.perRun?.cost ?? Number.POSITIVE_INFINITY,
      needsApproval: deps.pause?.needsApproval,
    },
    { tools: deps.tools, bundle: deps.config.name },
  );
  const inputGuards = makeGuardNode(deps.guards.input, "input");
  const finish = finishRunner(deps);
  return (node) => {
    switch (node.kind) {
      case "workflow-start":
        return inputGuards;
      case "agent":
        return agentRunner(loop, node.name);
      case "workflow-finish":
        return finish;
      case "router":
        throw new NotARunnerNodeError(`Router "${node.name}" is run by the flow engine`);
    }
  };
}
