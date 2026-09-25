import { z } from "zod";
import { SEARCH_TOOL_SUFFIX } from "../prompts/rag.js";
import type { KnowledgeSource, RagConnector, RagMode } from "../rag/types.js";
import { defineTool, type AnyTool } from "../tools/index.js";
import type { Class } from "./injection.js";
import { ComponentError, componentOf, requireComponent } from "./metadata.js";
import type { AgentMeta, BundleMeta } from "./meta-types.js";

export type RagMeta = Extract<ReturnType<typeof componentOf>, { kind: "rag" }>["meta"];

/** The `@Rag` classes the bundle's agents bind, checked. */
export function ragClassesOf(bundle: BundleMeta, agents: readonly AgentMeta[]): Class[] {
  const classes = [
    ...new Set(agents.flatMap((agent) => (agent.rag ?? []).map((binding) => binding.use))),
  ];
  for (const cls of classes) {
    if (componentOf(cls)?.kind !== "rag") {
      throw new ComponentError(
        `@Bundle "${bundle.name}": ${cls.name} in an agent's rag is not a @Rag`,
      );
    }
  }
  return classes;
}

export const ragMeta = (cls: Class): RagMeta => requireComponent(cls, "rag", "bundleOf").meta;

export const searchToolName = (meta: RagMeta): string => `search_${meta.name}`;

/** An agent's knowledge bases as config entries (for describe and profiles). */
export const ragSettings = (agent: AgentMeta): { name: string; mode: RagMode; k: number }[] =>
  (agent.rag ?? []).map((binding) => {
    const meta = ragMeta(binding.use);
    return { name: meta.name, mode: binding.mode, k: meta.k };
  });

const Output = z.object({
  passages: z.array(
    z.object({ source: z.string(), text: z.string(), score: z.number().optional() }),
  ),
});

/** Tool mode: `search_<name>(query)`; its cost is billed to `rag:<name>` (category retrieval). */
export function searchTool(meta: RagMeta, connector: RagConnector): AnyTool {
  const tool = defineTool({
    name: searchToolName(meta),
    description: `${meta.description}. ${SEARCH_TOOL_SUFFIX}`,
    input: z.object({ query: z.string().min(1) }),
    output: Output,
    run: async ({ query }, ctx) => {
      const retrieval = await connector.retrieve(query, { k: meta.k, signal: ctx.signal });
      ctx.reportCost(retrieval.costUsd ?? 0);
      return {
        passages: retrieval.passages.map((p) => ({
          source: p.source,
          text: p.text,
          ...(p.score === undefined ? {} : { score: p.score }),
        })),
      };
    },
  });
  return { ...tool, costCaller: `rag:${meta.name}` };
}

/** Context mode: per agent, the knowledge bases the core retrieves from before the agent runs. */
export function contextSources(
  agents: readonly AgentMeta[],
  instance: (cls: Class) => RagConnector,
): ReadonlyMap<string, readonly KnowledgeSource[]> {
  return new Map(
    agents.map((agent) => [
      agent.name,
      (agent.rag ?? [])
        .filter((binding) => binding.mode === "context")
        .map((binding) => {
          const meta = ragMeta(binding.use);
          const connector = instance(binding.use);
          return { name: meta.name, k: meta.k, retrieve: connector.retrieve.bind(connector) };
        }),
    ]),
  );
}
