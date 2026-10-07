/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
import { agentDefinitions } from "./agent-definitions.js";
import { agentLoopGraph, agentRunner, noJudges, pauseSeamApproval, } from "./agent-loop/index.js";
import { lastAnswer } from "./nodes/finalize.js";
import { makeGuardNode } from "./nodes/guards.js";
class NotARunnerNodeError extends Error {
    name = "NotARunnerNodeError";
}
export class UnknownActionError extends Error {
    name = "UnknownActionError";
}
class UnknownAgentError extends Error {
    name = "UnknownAgentError";
    constructor(agent) {
        super(`Unknown agent: ${agent}`);
    }
}
/** A workflow finish: the answer is the last contribution, checked by the output guards. */
function finishRunner(deps, name) {
    const outputGuards = makeGuardNode(deps.guards.output, "output");
    return async (state, config) => {
        const answer = lastAnswer(state);
        const guarded = await outputGuards({ ...state, answer }, config);
        const finishOutput = {
            kind: "multimodal",
            blocks: Array.isArray(state.contributions.at(-1)?.content)
                ? state.contributions.at(-1)?.content
                : [],
        };
        return { answer, finishes: { [name]: finishOutput }, ...guarded };
    };
}
/** Each configured agent's own loop, compiled once per graph (approval only with a pause seam). */
function agentLoops(deps) {
    const approval = deps.pause === undefined
        ? undefined
        : pauseSeamApproval(deps.requestApproval, deps.channelAdapters, deps.observer);
    const runBudgetCap = deps.limits.perRun?.cost ?? Number.POSITIVE_INFINITY;
    return new Map([...agentDefinitions(deps)].map(([name, agent]) => [
        name,
        agentLoopGraph({
            agent,
            bundle: deps.config.name,
            runBudgetCap,
            approval,
            judges: noJudges,
            piiPolicies: deps.piiPolicies?.(name),
            guardrails: deps.guardrails?.(name),
            observer: deps.observer,
        }, deps.pause?.checkpointer),
    ]));
}
/**
 * The runners of the nodes in the flow: a workflow start runs the input guards, an agent runs its
 * own loop (a subgraph: model turns, the move boundary, approval, tool calls), a workflow finish
 * takes the last answer and runs the output guards. Routers are the engine's own.
 */
export function flowRunners(deps) {
    const loops = agentLoops(deps);
    const inputGuards = makeGuardNode(deps.guards.input, "input");
    return (node) => {
        switch (node.kind) {
            case "workflow-start":
                return inputGuards;
            case "action": {
                if (!deps.actions)
                    throw new Error("Workflow actions not wired in RunDeps");
                const action = deps.actions(node.name);
                if (!action)
                    throw new UnknownActionError(`Unknown action: ${node.name}`);
                return async (state, config) => {
                    const context = { runId: config?.configurable?.runId ?? "", signal: config?.signal };
                    const appState = { runId: config?.configurable?.runId ?? "", activeNode: node.name };
                    await deps.observer?.onActionStart({ name: node.name, input: state, state: appState });
                    const result = await action.execute(state, context);
                    await deps.observer?.onActionEnd({ name: node.name, update: result, state: appState });
                    return result;
                };
            }
            case "agent": {
                const loop = loops.get(node.name);
                if (loop === undefined)
                    throw new UnknownAgentError(node.name);
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
                    }
                    catch (e) {
                        if (e && (e.name === "NodeInterrupt" || e.name === "GraphInterrupt"))
                            throw e; // Let pauses bubble up
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
            case "router":
                throw new NotARunnerNodeError(`Router "${node.name}" is run by the flow engine`);
        }
    };
}
