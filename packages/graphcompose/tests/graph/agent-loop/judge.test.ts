import { describe, it, expect, vi } from "vitest";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { agentLoopGraph } from "../../../src/graph/agent-loop/loop-graph.js";
import { loopInputOf } from "../../../src/graph/agent-loop/runner.js";
import { BaseJudge, Judge } from "../../../src/components/judge-decorators.js";
import { MemorySaver, Command } from "@langchain/langgraph";
import { noJudges } from "../../../src/graph/agent-loop/judge-points.js";
import { FakeChatModel } from "@langchain/core/utils/testing";

describe("Agent Retry Loop with Judges", () => {
  it("should retry if judge fails", async () => {
    let evalCount = 0;

    @Judge({
      name: "TestJudge",
      model: "test-model",
      systemPrompt: "test",
      metrics: {
        someMetric: { feedback: "Needs to be right" },
      },
    })
    class TestJudge extends BaseJudge {
      override async evaluate(state: any, ctx: any) {
        evalCount++;
        if (evalCount === 1) {
          return { passed: false, feedback: "Failed first time" };
        }
        return { passed: true };
      }
    }

    const mockModel = new FakeChatModel({
      responses: ["bad response", "good response"],
    });

    const agentDef = {
      name: "TestAgent",
      binding: {
        model: mockModel,
        settings: { model: "fake", price: { input: 0, output: 0 } } as any,
      },
      instructions: "You are a test agent",
      tools: [],
      limits: { modelCalls: 5, toolCalls: 5 },
      historyLimit: 10,
      summariesLimit: 10,
      knowledge: [],
      judges: [TestJudge],
      maxRetries: 3,
    };

    const deps = {
      agent: agentDef,
      bundle: "test-bundle",
      runBudgetCap: 100,
      judges: noJudges(),
    };

    const checkpointer = new MemorySaver();
    const graph = agentLoopGraph(deps, checkpointer);

    const initialFlowState: any = {
      task: "Hello",
      history: [],
      runId: "run-1",
      optionalBranches: [],
      routeReason: "",
      start: "start",
      finishes: {},
      previousAgent: "",
      visits: {},
      steps: 0,
      daySpentBeforeRunUsd: 0,
      forks: {},
      path: [],
      contributions: [],
      budgetUsd: 100,
      usage: [],
      replyWith: "",
      payload: {},
      summaries: [],
      approvals: [],
      guarded: "",
    };

    const loopState = loopInputOf(initialFlowState, "TestAgent");

    const result = await graph.invoke(loopState, {
      debug: true,
      configurable: { thread_id: "thread-1" },
    });

    console.log("FINAL RESULT:", JSON.stringify(result, null, 2));
    expect(evalCount).toBe(2);
    expect(result.reply).toBe("good response");
    expect(result.retries).toBe(1);

    // First message is user task (via model-node putting in loop history but mock ignores it).
    // The messages should include the HumanMessage with feedback
    const messages = result.messages;
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[messages.length - 1]).toBeInstanceOf(HumanMessage);
    expect((messages[messages.length - 1] as HumanMessage).content).toContain("Failed first time");
  });
});
