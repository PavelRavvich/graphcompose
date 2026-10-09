import { defaultSummaries } from "./agent-definitions.js";
import { assembleFlowGraph } from "./build.js";
import { flowRunners } from "./flow-runners.js";
/** The engine's runtime for a workflow: the existing nodes as runners, its routers, its limits. */
export function flowRuntimeOf(deps, run) {
  return {
    runnerFor: flowRunners(deps, run),
    routerFor: deps.routerFor,
    routerMemory: {
      summaries: defaultSummaries(deps.config),
      turns: deps.config.defaults.history.limit,
    },
    limits: run.limits,
    spentToday: run.spentToday,
    ...(deps.pause === undefined ? {} : { checkpointer: deps.pause.checkpointer }),
    observer: deps.observer,
    quorumRouters: deps.quorumRouters,
    container: deps.container,
    batchStrategies: deps.batchStrategies,
  };
}
/** The workflow's flow assembled into a LangGraph graph for one run. */
export async function flowGraphOf(deps, run) {
  return assembleFlowGraph(deps.flow, flowRuntimeOf(deps, run));
}
