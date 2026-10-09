import { RunnableLambda } from "@langchain/core/runnables";
import { recordReportedCost } from "../../finops/usage.js";
import { CITE_INSTRUCTION, knowledgeBlock } from "../../prompts/rag.js";
/**
 * Context mode: before the agent's loop, each knowledge base is asked for the task's top-k
 * search results. Each retrieval is a named runnable (`rag:<name>`), so it is a span in the trace; its
 * cost is billed to `rag:<name>` (category retrieval). A failure leaves those results out — the
 * turn goes on (fail-open), the error stays on the span.
 */
export async function gatherKnowledge(sources, query, config, deps, appState) {
  const records = [];
  const blocks = [];
  const signal = config?.signal ?? new AbortController().signal;
  for (const source of sources) {
    try {
      if (deps && appState) {
        await deps.onRagStart({ name: source.name, input: query, state: appState });
      }
      const retrieval = await RunnableLambda.from((q) =>
        source.retrieve(q, { topK: source.topK, signal }),
      ).invoke(query, { ...config, runName: `rag:${source.name}` });
      if (deps && appState) {
        await deps.onRagEnd({ name: source.name, update: retrieval, state: appState });
      }
      records.push(
        recordReportedCost(
          { name: source.name, costCaller: `rag:${source.name}` },
          retrieval.costUsd ?? 0,
        ),
      );
      if (retrieval.results.length > 0) blocks.push(knowledgeBlock(source.name, retrieval.results));
    } catch {
      // fail-open: knowledge is an aid, not a gate
    }
  }
  return {
    block: blocks.length === 0 ? "" : `${blocks.join("\n\n")}\n\n${CITE_INSTRUCTION}\n\n`,
    records,
  };
}
