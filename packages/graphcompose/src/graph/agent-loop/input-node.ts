import { HumanMessage } from "@langchain/core/messages";
import { renderAgentInput } from "../../prompts/agents.js";
import { formatContributions, formatDecisionsForAgent, formatMemory } from "../contributions.js";
import { gatherKnowledge } from "../nodes/knowledge.js";
import { mergeContent } from "../multimodal.js";
import type { AsyncNode } from "../types.js";
import type { AgentLoopDeps } from "./deps.js";
import type { AgentLoopStateType, AgentLoopUpdate } from "./state.js";

/**
 * The agent's input, once per call of the agent (a node of its own, so a resume never retrieves or
 * pays for it again): context-mode knowledge, the task, the other agents' contributions, the
 * thread's memory and the decisions on its own calls in this turn.
 */
export function makeInputNode(deps: AgentLoopDeps): AsyncNode<AgentLoopStateType, AgentLoopUpdate> {
  const { agent } = deps;
  return async (state, config) => {
    const appState = { runId: state.runId, threadId: state.runId, activeNode: deps.agent.name, variables: {}, history: [] }; // AppState stub
    const knowledge = await gatherKnowledge(agent.knowledge, state.task, config, deps.observer, appState);
    const renderedInput = renderAgentInput(
      state.task,
      formatContributions(state.contributions),
      formatMemory(state, { summaries: agent.summariesLimit, turns: agent.historyLimit }),
      formatDecisionsForAgent(state.approvals, agent.name),
    );
    const input = mergeContent(knowledge.block, renderedInput);
    return { messages: [new HumanMessage({ content: input })], usage: knowledge.records };
  };
}
