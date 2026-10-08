import { interrupt } from "@langchain/langgraph";
import { recordReportedCost } from "../../finops/usage.js";
import { renderToolResult } from "../../tools/index.js";
import { toolNamed } from "./deps.js";
const errorMessage = (error) => error instanceof Error ? error.message : String(error);
/** The run's signal combined with the tool's own timeout. */
const signalFor = (tool, config) => {
    const timeout = AbortSignal.timeout(tool.timeoutMs);
    return config?.signal === undefined ? timeout : AbortSignal.any([config.signal, timeout]);
};
/** Tool failures are recoverable: whatever went wrong, the model reads it as `Tool error: …`. */
async function runTool(tool, args, context) {
    try {
        return renderToolResult(await tool.invoke(args, context));
    }
    catch (error) {
        if (error && typeof error === "object" && "name" in error && error.name === "GraphInterrupt") {
            throw error;
        }
        return renderToolResult({ kind: "error", message: errorMessage(error) });
    }
}
/**
 * One tool call = one task (`Send`): its result is stored under its call id as soon as it finishes,
 * so a crash later never repeats it. A call running when the process died runs again with the same
 * `callId` — the tool's idempotency key. Reported costs land in the loop's usage.
 */
export function makeToolNode(deps) {
    return async (task, config) => {
        const tool = toolNamed(deps.agent, task.tool);
        const runId = config?.configurable?.runId || "unknown";
        const appState = {
            runId,
            threadId: runId,
            activeNode: deps.agent.name,
            variables: {},
            history: [],
        }; // AppState stub
        if (tool === undefined) {
            return {};
        }
        const usage = [];
        const context = {
            executionContext: config?.configurable?.executionContext,
            runId: task.runId,
            workflow: deps.bundle,
            agent: deps.agent.name,
            callId: task.callId,
            signal: signalFor(tool, config),
            reportCost: (usd) => {
                usage.push(recordReportedCost(tool, usd));
            },
            pause: (ask) => {
                const pending = {
                    kind: "interactive",
                    agent: deps.agent.name,
                    tool: tool.name,
                    callId: task.callId,
                    args: task.args,
                    payload: ask,
                };
                return interrupt(pending);
            },
        };
        await deps.observer?.onToolStart({
            toolName: task.tool,
            agentName: deps.agent.name,
            arguments: task.args,
            state: appState,
        });
        const content = await runTool(tool, task.args, context);
        await deps.observer?.onToolEnd({
            toolName: task.tool,
            agentName: deps.agent.name,
            update: content,
            state: appState,
        });
        return { results: { [task.callId]: { callId: task.callId, tool: task.tool, content } }, usage };
    };
}
