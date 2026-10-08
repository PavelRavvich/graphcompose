import { interrupt } from "@langchain/langgraph";
import { validate } from "../../dto/schema.js";
import { ToolCallApprovalDecision, } from "../../dto/standard/framework.js";
/**
 * The pause seam as an approval: `interrupt` pauses the run at the call (the checkpoint is the
 * boundary — nothing ran before it), the decision `resume` brings is validated like any external input.
 */
export function pauseSeamApproval(dispatchChannel, channelAdapters, observer) {
    return {
        requestApproval: async (ask, agent, tool, runId, metadata, executionContext) => {
            const pending = {
                kind: "approval",
                agent,
                callId: ask.callId,
                tool: ask.tool,
                args: ask.arguments,
            };
            try {
                let rawDecision = interrupt(pending);
                if (tool.channel && channelAdapters) {
                    const appState = { runId, threadId: runId, activeNode: agent };
                    await observer?.onChannelEnd({
                        name: tool.channel,
                        update: rawDecision,
                        state: appState,
                    });
                    const adapter = channelAdapters(tool.channel);
                    if (adapter) {
                        rawDecision = await adapter.interpret(rawDecision);
                    }
                }
                return validate(ToolCallApprovalDecision, rawDecision);
            }
            catch (e) {
                if (e && e.name === "NodeInterrupt") {
                    if (tool.channel && dispatchChannel) {
                        const appState = { runId, threadId: runId, activeNode: agent };
                        await observer?.onChannelStart({
                            name: tool.channel,
                            input: ask.arguments,
                            state: appState,
                        });
                        await dispatchChannel(tool.channel, {
                            runId,
                            agentName: agent,
                            toolName: tool.name,
                            toolArguments: ask.arguments,
                            metadata,
                            executionContext,
                        });
                    }
                }
                throw e;
            }
        },
    };
}
