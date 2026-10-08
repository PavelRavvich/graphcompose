import { agentDefinitions } from "./agent-definitions.js";
import { agentLoopGraph, agentRunner, noJudges, pauseSeamApproval, } from "./agent-loop/index.js";
import { lastAnswer } from "./nodes/finalize.js";
import { makeGuardNode } from "./nodes/guards.js";
import { componentOf } from "../components/metadata.js";
import { collectFlow } from "./flow-nodes.js";
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
/** A workflow finish: the replyWith is the last contribution, checked by the output guards. */
function finishRunner(deps, name) {
    const outputGuards = makeGuardNode(deps.guards.output, "output");
    return async (state, config) => {
        const replyWith = lastAnswer(state);
        const guarded = await outputGuards({ ...state, replyWith }, config);
        const finishOutput = {
            kind: "multimodal",
            blocks: Array.isArray(state.contributions.at(-1)?.content)
                ? state.contributions.at(-1)?.content
                : [],
        };
        return { replyWith, finishes: { [name]: finishOutput }, ...guarded };
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
export function flowRunners(deps, run) {
    const loops = agentLoops(deps);
    const inputGuards = makeGuardNode(deps.guards.input, "input");
    return (node) => {
        switch (node.kind) {
            case "quorumRouter":
            case "router":
                return undefined;
            case "workflow-start":
                return inputGuards;
            case "action": {
                if (!deps.actions)
                    throw new Error("Workflow actions not wired in RunDeps");
                const action = deps.actions(node.name);
                if (!action)
                    throw new UnknownActionError(`Unknown action: ${node.name}`);
                return async (state, config) => {
                    const runId = config?.configurable?.runId ?? "";
                    const getComponentClass = (nodeName) => {
                        const collected = collectFlow(deps.flow);
                        return collected.nodes.get(nodeName)?.use;
                    };
                    const runCompensation = async (compClass, childState) => {
                        const comp = componentOf(compClass);
                        if (!comp)
                            throw new Error(`Component not found for compensation class`);
                        if (comp.kind === "action") {
                            if (!deps.actions)
                                throw new Error("Actions not wired");
                            const act = deps.actions(comp.meta.name);
                            const ctx = { runId, signal: config?.signal, getComponentClass, runCompensation };
                            return await act.execute(childState, ctx);
                        }
                        if (comp.kind === "agent") {
                            const loop = loops.get(comp.meta.name);
                            if (!loop)
                                throw new Error(`Agent loop not found for ${comp.meta.name}`);
                            const runner = agentRunner(loop, comp.meta.name);
                            return await runner(childState, config);
                        }
                        if (comp.kind === "workflow") {
                            const { flowGraphOf } = await import("./flow-runtime.js");
                            const flowReal = await flowGraphOf(deps, run);
                            return await flowReal.graph.invoke(childState, {
                                configurable: { runId, thread_id: runId },
                            });
                        }
                        throw new Error(`Unsupported compensation kind: ${comp.kind}`);
                    };
                    const context = {
                        runId,
                        signal: config?.signal,
                        getComponentClass,
                        runCompensation,
                        executionContext: config?.configurable?.executionContext,
                    };
                    const appState = { runId, activeNode: node.name };
                    await deps.observer?.onActionStart({ name: node.name, input: state, state: appState });
                    const result = await action.execute(state, context);
                    await deps.observer?.onActionEnd({ name: node.name, update: result, state: appState });
                    return result;
                };
            }
            case "workflow": {
                const component = componentOf(node.use);
                if (!component || component.kind !== "workflow")
                    throw new Error(`Not a workflow: ${node.name}`);
                return async (state, config) => {
                    const runId = state.runId;
                    const appState = { runId, activeNode: node.name, variables: {}, history: state.history };
                    await deps.observer?.onActionStart({ name: node.name, input: state, state: appState });
                    const meta = component.meta;
                    const WorkflowClass = node.use;
                    const mock = deps.mockedWorkflows?.get(node.use);
                    if (mock) {
                        const mockResult = await mock(state, config);
                        await deps.observer?.onActionEnd({
                            name: node.name,
                            update: mockResult || {},
                            state: appState,
                        });
                        return mockResult || {};
                    }
                    const instance = new WorkflowClass();
                    const localSettings = instance.settings ? instance.settings() : {};
                    // Create sub-dependencies inheriting from parent but overriding flow
                    const subDeps = {
                        ...deps,
                        flow: meta.flow,
                        // Ideally we'd merge localSettings.limits into subDeps.limits here,
                        // but for now we rely on the global ledger.
                    };
                    // Re-import flowGraphOf dynamically or use a passed reference to avoid circular dependency
                    // Wait, flowGraphOf is in flow-runtime.ts, which calls this file. Circular dependency!
                    // We can require it inline.
                    const { flowGraphOf } = await import("./flow-runtime.js");
                    const flow = await flowGraphOf(subDeps, {
                        limits: deps.limits,
                        spentToday: run.spentToday,
                    });
                    const childState = {
                        ...state,
                        steps: 0,
                        path: [],
                        visits: {},
                        forks: {},
                        _batchCursor: {},
                    };
                    const result = await flow.graph.invoke(childState, config);
                    await deps.observer?.onActionEnd({ name: node.name, update: result, state: appState });
                    return {
                        payload: result.payload,
                        contributions: result.contributions,
                        steps: result.steps,
                    };
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
        }
    };
}
