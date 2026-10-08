import { z } from "zod";
import { SEARCH_TOOL_SUFFIX } from "../prompts/rag.js";
import { defineTool } from "../tools/index.js";
import { ComponentError, componentOf, requireComponent } from "./metadata.js";
/** The `@Rag` classes the workflow's agents bind, checked. */
export function ragClassesOf(bundle, agents) {
    const classes = [
        ...new Set(agents.flatMap((agent) => (agent.rag ?? []).map((binding) => binding.use))),
    ];
    for (const cls of classes) {
        if (componentOf(cls)?.kind !== "rag") {
            throw new ComponentError(`@Workflow "${bundle.name}": ${cls.name} in an agent's rag is not a @Rag`);
        }
    }
    return classes;
}
export const ragMeta = (cls) => requireComponent(cls, "rag", "workflowOf").meta;
export const searchToolName = (meta) => `search_${meta.name}`;
/** An agent's knowledge bases as config entries (for describe and profiles). */
export const ragSettings = (agent) => (agent.rag ?? []).map((binding) => {
    const meta = ragMeta(binding.use);
    return { name: meta.name, mode: binding.mode, topK: meta.topK };
});
const Output = z.object({
    results: z.array(z.object({ source: z.string(), text: z.string(), score: z.number().optional() })),
});
/** Tool mode: `search_<name>(query)`; its cost is billed to `rag:<name>` (category retrieval). */
export function searchTool(meta, connector) {
    const tool = defineTool({
        name: searchToolName(meta),
        description: `${meta.description}. ${SEARCH_TOOL_SUFFIX}`,
        input: z.object({ query: z.string().min(1) }),
        output: Output,
        run: async ({ query }, ctx) => {
            const retrieval = await connector.retrieve(query, { topK: meta.topK, signal: ctx.signal });
            ctx.reportCost(retrieval.costUsd ?? 0);
            return {
                results: retrieval.results.map((result) => ({
                    source: result.source,
                    text: result.text,
                    ...(result.score === undefined ? {} : { score: result.score }),
                })),
            };
        },
    });
    return { ...tool, costCaller: `rag:${meta.name}` };
}
/** Context mode: per agent, the knowledge bases the core retrieves from before the agent runs. */
export function contextSources(agents, instance) {
    return new Map(agents.map((agent) => [
        agent.name,
        (agent.rag ?? [])
            .filter((binding) => binding.mode === "context")
            .map((binding) => {
            const meta = ragMeta(binding.use);
            const connector = instance(binding.use);
            return { name: meta.name, topK: meta.topK, retrieve: connector.retrieve.bind(connector) };
        }),
    ]));
}
