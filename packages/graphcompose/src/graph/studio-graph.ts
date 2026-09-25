import type { AppDeps } from "../app.js";
import { buildGraph, type AgentGraph } from "./graph.js";

/**
 * A graph for LangGraph Studio: Studio runs it itself, so tracing callbacks (when on) are bound to
 * the graph. Session "studio" groups Studio runs in Langfuse.
 */
export function studioGraph(deps: AppDeps): AgentGraph {
  const graph = buildGraph(deps);
  if (deps.tracing === undefined) return graph;
  const callbacks = deps.tracing.callbacks({
    bundle: deps.config.name,
    threadId: "studio",
    runId: "studio",
  });
  return graph.withConfig({ callbacks });
}
