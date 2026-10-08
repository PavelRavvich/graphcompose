import { describe, it, expect } from "vitest";
import { Workflow, Agent, Tool } from "../../../src/components/decorators.js";
import { from } from "../../../src/router/index.js";
import { WorkflowStart, WorkflowFinish, type WorkflowDefinition } from "../../../src/core/index.js";
import { testWith } from "../../../src/testing/test-with.js";
import { QuorumRouter, type QuorumStrategy } from "../../../src/concurrency/quorum.decorator.js";
import { ComponentScript } from "../../../src/testing/script-book.js";
import { z } from "zod";

@Tool({ name: "slow_tool", description: "A slow tool", input: z.object({}), output: z.object({}) })
class SlowTool {
  run = async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {};
  };
}

@Tool({ name: "fast_tool", description: "A fast tool", input: z.object({}), output: z.object({}) })
class FastTool {
  run = async () => {
    return {};
  };
}

@Agent({ name: "fast_agent", prompt: "You are fast", tools: [FastTool] })
class FastAgent {}

@Agent({ name: "slow_agent", prompt: "You are slow", tools: [SlowTool] })
class SlowAgent {}

@QuorumRouter({ name: "quorum_router" })
class MyQuorumRouter implements QuorumStrategy {
  filterVote(state: any) {
    return true;
  }
  route(state: any, hasQuorum: boolean) {
    return "workflow_finish";
  }
}

@Workflow({
  name: "quorum-test",
  version: "1.0.0",
  flow: [
    from(WorkflowStart).nextParallel(FastAgent, SlowAgent),
    from(FastAgent, SlowAgent).joinQuorum(MyQuorumRouter, { min: 1 }).routes(WorkflowFinish),
  ],
})
class QuorumTestWorkflow implements WorkflowDefinition {
  settings = () => ({ limits: { steps: 50 }, models: {} as any });
}

describe("QuorumRouter", () => {
  it("aborts the slower branch when the quorum is met, saving an LLM call", async () => {
    testWith(QuorumTestWorkflow, async (app) => {
      app.script(FastAgent, ComponentScript.agentTurns([{}]));
      app.script(SlowAgent, ComponentScript.agentTurns([{}, {}]));

      const { events } = await app.execute("workflow_start", {});

      const fastAgentEnd = events.find((e) => e.type === "AgentFinish" && e.agent === "fast_agent");
      expect(fastAgentEnd).toBeDefined();

      const slowAgentEnd = events.find((e) => e.type === "AgentFinish" && e.agent === "slow_agent");
      expect(slowAgentEnd).toBeUndefined();
    });
  });
});
