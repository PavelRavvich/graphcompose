/**
 * The agent loop on its own (#150): a scripted model picked by the conversation, tools that log
 * what they did, and helpers to start, pause, resume and read the loop. Imports `src` only, so the
 * kill-and-resume child process (`loop-process.ts`) can load it too.
 */
import { ToolMessage } from "@langchain/core/messages";
import { Command, MemorySaver } from "@langchain/langgraph";
import { agentLoopGraph, loopInputOf, noJudges, pauseSeamApproval, } from "../../../src/graph/agent-loop/index.js";
import { resolveSettings } from "../../../src/llm/registry.js";
import { ConversationModel, repoTools } from "./scripted.js";
export * from "./scripted.js";
export const AGENT = "coder";
export function harness(options, checkpointer = new MemorySaver()) {
    const effects = [];
    const modelCalls = [];
    const log = options.log ?? ((effect) => effects.push(effect));
    const model = new ConversationModel(options.moves, options.onModelCall ?? ((move) => modelCalls.push(move)));
    const settings = resolveSettings({ model: "test/coder", price: { inputPerMTok: 3, outputPerMTok: 6 } }, { temperature: 0, maxTokens: 1000, thinking: "default", cache: false });
    const graph = agentLoopGraph({
        agent: {
            name: AGENT,
            binding: { model, settings },
            instructions: async () => "You change files in the repository.",
            tools: (options.tools ?? repoTools)(log),
            limits: { modelCalls: 12, toolCalls: 20, ...options.limits },
            historyLimit: 0,
            summariesLimit: 0,
            knowledge: [],
        },
        bundle: "test-bundle",
        runBudgetCap: options.runBudgetCap ?? Number.POSITIVE_INFINITY,
        approval: options.approval === false ? undefined : pauseSeamApproval(),
        judges: noJudges,
        // @ts-ignore
        guardrails: options.guardrails
            ? { override: false, instances: options.guardrails }
            : undefined,
    }, checkpointer);
    return { graph, effects, modelCalls, model };
}
const flowStateOf = (task) => ({
    task,
    finishes: {},
    optionalBranches: [],
    history: [],
    runId: "run-1",
    next: "",
    routeReason: "",
    contributions: [],
    usage: [],
    budgetUsd: Number.POSITIVE_INFINITY,
    answer: "",
    guarded: "",
    approvals: [],
    summaries: [],
    start: "",
    previousAgent: "",
    visits: {},
    steps: 0,
    path: ["workflow-start.chat", "main"],
    daySpentBeforeRunUsd: null,
    forks: {},
    payload: {},
    batchItem: undefined,
    _batchCursor: {},
});
/** The loop's input for a task,
  finishes: {},
  optionalBranches: [], as the agent's flow node hands it over. */
export const startInput = (task = "change a.ts") => loopInputOf(flowStateOf(task), AGENT);
export const threadConfig = (thread) => ({
    configurable: { thread_id: thread },
    durability: "sync",
});
export async function stateOf(graph, thread) {
    // LangGraph boundary: snapshot values are the loop's own state
    return (await graph.getState(threadConfig(thread))).values;
}
export async function endOf(graph, thread) {
    const snapshot = await graph.getState(threadConfig(thread));
    const [first] = snapshot.tasks.flatMap((task) => task.interrupts);
    if (first !== undefined)
        return { kind: "paused", pending: first.value };
    return { kind: "answered", reply: (await stateOf(graph, thread)).reply ?? "" };
}
export async function runLoop(graph, input, thread) {
    await graph.invoke(input, threadConfig(thread));
    return endOf(graph, thread);
}
export const decision = (decided) => new Command({ resume: decided });
/** The tool messages a model request carried: [callId, content] in order. */
export const toolMessagesOf = (messages) => (messages ?? [])
    .filter((message) => ToolMessage.isInstance(message))
    .map((message) => [message.tool_call_id, message.text]);
