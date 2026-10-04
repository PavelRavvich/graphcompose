import type { BuiltApp } from "../app/create-app.js";
import type { Class } from "../components/injection.js";
import { agentDefinitions } from "../graph/agent-definitions.js";
import { labelOf, Self, type FlowNode, type SelfTarget } from "../graph/flow.js";
import { agentLoopGraph, loopInputOf, noJudges } from "../graph/agent-loop/index.js";
import { RouterDecisionError } from "../graph/nodes/flow-router.js";
import type { FlowStateType } from "../graph/flow-state.js";
import type { ToolContext, ToolResult } from "../tools/index.js";
import { TestSetupError } from "./errors.js";
import { nodeNameOf } from "./failure-facts.js";
import { toolNameOf } from "./script.js";

/** One tool of the app, as the agents get it (validation, timeout, errors as results). */
export interface ToolSlice<TInput, TOutput> {
  invoke(input: TInput): Promise<ToolResult<TOutput>>;
}

/** One router of the app on its own: a text in, the node it chooses out. */
export interface RouterSlice {
  decide(input: string): Promise<FlowNode | SelfTarget>;
}

/** One agent of the app on its own: a task in, its answer out (no flow, no approval pause). */
export interface AgentSlice {
  answer(task: string): Promise<string>;
}

/** A tool class, typed by its `run`. */
export type ToolClassOf<TInput, TOutput> = Class<{
  run(input: TInput, ctx: ToolContext): Promise<TOutput>;
}>;

export function toolSlice<TInput, TOutput>(
  built: BuiltApp,
  cls: ToolClassOf<TInput, TOutput>,
): ToolSlice<TInput, TOutput> {
  const tool = built.deps.tools(toolNameOf(cls));
  const ctx: ToolContext = {
    runId: "tool-slice",
    workflow: built.deps.config.name,
    agent: "",
    callId: "tool-slice",
    signal: new AbortController().signal,
    reportCost: () => undefined,
  };
  return {
    // the tool validates its result against the output DTO that `run` returns
    invoke: async (input) => (await tool.invoke(input, ctx)) as ToolResult<TOutput>,
  };
}

export function routerSlice(built: BuiltApp, target: FlowNode): RouterSlice {
  const name = nodeNameOf(target);
  const loaded = built.deps.routers.find((router) => router.name === name);
  if (loaded === undefined) {
    throw new TestSetupError(`app.router(${labelOf(target)}): not a router of this workflow`);
  }
  const router = built.deps.routerFor(loaded);
  return {
    decide: async (input) => {
      const options = loaded.routes.map((item) => ({ name: item.option, description: item.text }));
      const outcome = await router.route({ input, options, instructions: loaded.instructions });
      if (outcome.kind === "failed") {
        throw new RouterDecisionError(name, "router.failed", outcome.reason, []);
      }
      // routers only decide for one of the options: a route's node, or `self` (no node of its own)
      return built.nodes.get(outcome.decision.next) ?? Self;
    },
  };
}

/** A run's state before anything ran: one task, nothing contributed or spent yet. */
const freshState = (task: string, runId: string): FlowStateType => ({
  task,
  history: [],
  runId,
  next: "",
  routeReason: "",
  contributions: [],
  usage: [],
  budgetUsd: Number.POSITIVE_INFINITY,
  answer: "",
  guarded: "",
  approvals: [],
  summaries: [],
  payload: {},
  forks: {},
  start: "",
  previousAgent: "",
  visits: {},
  steps: 0,
  path: [],
  daySpentBeforeRunUsd: null,
});

export function agentSlice(built: BuiltApp, target: FlowNode): AgentSlice {
  const name = nodeNameOf(target);
  const agent = agentDefinitions(built.deps).get(name);
  if (agent === undefined) {
    throw new TestSetupError(`app.agent(${labelOf(target)}): not an agent of this workflow`);
  }
  const loop = agentLoopGraph({
    agent,
    bundle: built.deps.config.name,
    runBudgetCap: Number.POSITIVE_INFINITY,
    judges: noJudges,
  });
  return {
    answer: async (task) => {
      const after = await loop.invoke(loopInputOf(freshState(task, "agent-slice"), name));
      return after.reply ?? "";
    },
  };
}
