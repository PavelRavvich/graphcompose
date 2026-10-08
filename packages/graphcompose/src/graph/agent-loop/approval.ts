import { interrupt } from "@langchain/langgraph";
import { validate } from "../../dto/schema.js";
import {
  ToolCallApprovalDecision,
  type ToolCallApprovalAsk,
} from "../../dto/standard/framework.js";
import type { PendingPause } from "../../pause/index.js";
import type { AnyTool } from "../../tools/index.js";
import type { ChannelRequest } from "../../components/decorators.js";
import type { ObserverManager } from "../../core/observer-manager.js";

/**
 * How the loop gets a decision on a tool call before it runs — one call per ask. Until #152 wires it
 * to channels, it is backed by the pause seam: the run pauses and `resume` brings the decision.
 */
export interface ToolCallApproval {
  readonly requestApproval: (
    ask: ToolCallApprovalAsk,
    agent: string,
    tool: AnyTool,
    runId: string,
    metadata: Record<string, unknown>,
    executionContext?: unknown,
  ) => Promise<ToolCallApprovalDecision>;
}

/**
 * The pause seam as an approval: `interrupt` pauses the run at the call (the checkpoint is the
 * boundary — nothing ran before it), the decision `resume` brings is validated like any external input.
 */
export function pauseSeamApproval(
  dispatchChannel?: (channelName: string, req: ChannelRequest) => Promise<void>,
  channelAdapters?: (channel: string) => any,
  observer?: ObserverManager,
): ToolCallApproval {
  return {
    requestApproval: async (ask, agent, tool, runId, metadata, executionContext) => {
      const pending: PendingPause = {
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
      } catch (e: any) {
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
              toolArguments: ask.arguments as Record<string, unknown>,
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
