import { agentDefinitions } from "../graph/agent-definitions.js";
import { labelOf, Self } from "../graph/flow.js";
import { agentLoopGraph, loopInputOf, noJudges } from "../graph/agent-loop/index.js";
import { RouterDecisionError } from "../graph/nodes/flow-router.js";
import { TestSetupError } from "./errors.js";
import { nodeNameOf } from "./failure-facts.js";
import { toolNameOf } from "./script.js";
export function toolSlice(built, cls) {
    const tool = built.deps.tools(toolNameOf(cls));
    const ctx = {
        runId: "tool-slice",
        workflow: built.deps.config.name,
        agent: "",
        callId: "tool-slice",
        signal: new AbortController().signal,
        reportCost: () => undefined,
        pause: () => {
            throw new Error("Cannot pause in isolated tests");
        },
    };
    return {
        // the tool validates its result against the output DTO that `run` returns
        invoke: async (input) => (await tool.invoke(input, ctx)),
    };
}
export function routerSlice(built, target) {
    const name = nodeNameOf(target);
    const loaded = built.deps.routers.find((router) => router.name === name);
    if (loaded === undefined) {
        throw new TestSetupError(`app.router(${labelOf(target)}): not a router of this workflow`);
    }
    const router = built.deps.routerFor(loaded);
    return {
        decide: async (input) => {
            const options = await Promise.all(loaded.routes.map(async (item) => ({
                name: item.option,
                description: await (typeof item.condition === "function"
                    ? // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
                        item.condition({})
                    : item.condition),
            })));
            const outcome = await router.route({
                input,
                options,
                instructions: await (typeof loaded.instructions === "function"
                    ? // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
                        loaded.instructions({})
                    : loaded.instructions),
            });
            if (outcome.kind === "failed") {
                throw new RouterDecisionError(name, "router.failed", outcome.reason, []);
            }
            // routers only decide for one of the options: a route's node, or `self` (no node of its own)
            return built.nodes.get(outcome.decision.next) ?? Self;
        },
    };
}
/** A run's state before anything ran: one task, nothing contributed or spent yet. */
const freshState = (task, runId) => ({
    task,
    optionalBranches: [],
    history: [],
    runId,
    next: "",
    routeReason: "",
    contributions: [],
    usage: [],
    budgetUsd: Number.POSITIVE_INFINITY,
    answer: "",
    finishes: {},
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
    batchItem: undefined,
    _batchCursor: {},
});
export function agentSlice(built, target) {
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
