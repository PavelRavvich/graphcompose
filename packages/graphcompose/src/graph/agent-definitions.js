import { resolveAgentLimits } from "./agent-loop/index.js";
export class MissingAgentPromptError extends Error {
    name = "MissingAgentPromptError";
}
/** Summaries a reader sees by default: defaults.history.summaries, else compaction.keep, else none. */
export const defaultSummaries = (config) => config.defaults.history.summaries ?? config.compaction?.keep ?? 0;
/** An agent's limits and memory with defaults applied. */
const limitsOf = (agent, config) => ({
    limits: resolveAgentLimits(agent?.maxToolCalls, config.defaults.tools?.maxToolCalls).limits,
    historyLimit: agent?.historyLimit ?? config.defaults.history.limit,
    summariesLimit: agent?.historySummaries ?? defaultSummaries(config),
});
/** Every configured agent with its model, prompt, tools, limits and knowledge. */
export function agentDefinitions(deps) {
    const prompts = new Map(Object.entries(deps.prompts));
    const settings = new Map(Object.entries(deps.config.agents));
    const definitions = new Map();
    for (const [name, binding] of deps.registry.agents) {
        const instructions = prompts.get(name);
        if (instructions === undefined)
            throw new MissingAgentPromptError(`No prompt for ${name}`);
        const agent = settings.get(name);
        definitions.set(name, {
            name,
            binding,
            instructions: instructions,
            tools: (agent?.tools ?? []).map(deps.tools),
            ...limitsOf(agent, deps.config),
            knowledge: deps.knowledge?.(name) ?? [],
        });
    }
    return definitions;
}
