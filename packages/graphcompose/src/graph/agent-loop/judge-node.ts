import { HumanMessage } from "@langchain/core/messages";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { AsyncNode } from "../types.js";
import type { AgentLoopDeps } from "./deps.js";
import type { AgentLoopStateType, AgentLoopUpdate } from "./state.js";
import { componentOf } from "../../components/metadata.js";
import type { BaseJudge, JudgeMeta } from "../../components/judge-decorators.js";

export function makeJudgeNode(deps: AgentLoopDeps): AsyncNode<AgentLoopStateType, AgentLoopUpdate> {
  const agent = deps.agent.name;
  return async (state, config) => {
    console.log("EXECUTING JUDGE NODE", state.reply);
    const meta = deps.agent;
    const judgesClasses = meta.judges || [];
    const maxRetries = meta.maxRetries ?? 0;
    
    import("fs").then(fs => fs.writeFileSync("/tmp/judge_run.log", "reached judge node with " + judgesClasses.length + " classes"));
    if (judgesClasses.length === 0 || state.reply === null) {
      return {}; // No judges or no reply to judge
    }
    
    const appState = { runId: state.runId, threadId: state.runId, activeNode: agent, variables: {}, history: state.messages };
    
    let allPassed = true;
    let combinedFeedback = "";
    
    for (const JudgeClass of judgesClasses) {
      const judgeInstance = new (JudgeClass as new () => BaseJudge)();
      const judgeMetaWrapper = componentOf(JudgeClass);
      const judgeMeta = judgeMetaWrapper?.meta as JudgeMeta;
      const judgeName = judgeMeta?.name || JudgeClass.name;
      
      let chatModel: BaseChatModel | undefined = deps.agent.binding.model;
      
      const ctx = {
        runId: state.runId,
        idempotencyKey: `run_${state.runId}_node_${agent}_judge_${judgeName}_retry_${state.retries}`,
        chatModel,
        executionContext: config?.configurable?.executionContext,
      };
      
      await deps.observer?.onJudgeStart({
         name: judgeName,
         agentName: agent,
         input: state.reply,
         state: appState
      });
      
      // We pass the replyWith inside state to evaluate
      const result = await judgeInstance.evaluate({ ...state, replyWith: state.reply }, ctx);
      
      await deps.observer?.onJudgeEnd({
         name: judgeName,
         agentName: agent,
         update: result,
         state: appState
      });
      
      if (!result.passed) {
        allPassed = false;
        if (result.feedback) {
           combinedFeedback += `- [${judgeName}]: ${result.feedback}\n`;
        }
      }
    }
    
    if (allPassed) {
       return {}; // Move to END
    }
    
    // Failed quality gate
    if (state.retries >= maxRetries) {
       throw new Error(`QualityGateError: Agent ${agent} failed to pass quality gates after ${maxRetries} retries.\nFeedback:\n${combinedFeedback}`);
    }
    
    // Retry loop!
    const feedbackMessage = new HumanMessage(`Your response failed the quality gates. Please fix the following errors:\n${combinedFeedback}`);
    return {
       reply: null,
       retries: 1, // reducer is add, so this increments by 1
       messages: [feedbackMessage]
    };
  };
}
