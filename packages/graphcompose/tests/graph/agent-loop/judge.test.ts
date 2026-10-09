import { describe, it, expect, vi } from "vitest";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { agentLoopGraph } from "../../../src/graph/agent-loop/loop-graph.js";
import { loopInputOf } from "../../../src/graph/agent-loop/runner.js";
import { BaseJudge, Judge } from "../../../src/components/judge-decorators.js";
import { MemorySaver, Command } from "@langchain/langgraph";
import { noJudges } from "../../../src/graph/agent-loop/judge-points.js";
import { SimpleChatModel } from "@langchain/core/language_models/chat_models";
import { BaseChatModelParams } from "@langchain/core/language_models/chat_models";

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

    class CustomFake extends SimpleChatModel {
      responses = ["bad response", "good response"];
      _call(messages: any, options: any, runManager?: any): Promise<string> {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        return Promise.resolve(this.responses.shift() || "default");
      }
      _llmType() {
        return "custom_fake";
      }
    }
    const mockModel = new CustomFake({});

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
      agent: agentDef as any,
      bundle: "test-bundle",
      runBudgetCap: 100,
      judges: noJudges,
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

    // eslint-disable-next-line no-console
      console.log("FINAL RESULT:", JSON.stringify(result, null, 2));
    expect(evalCount).toBe(2);
    expect(result.reply).toBe("good response");
    expect(result.retries).toBe(1);

    // First message is user task (via model-node putting in loop history but mock ignores it).
    // The messages should include the HumanMessage with feedback
    const messages = result.messages;
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[messages.length - 2]).toBeInstanceOf(HumanMessage);
    expect((messages[messages.length - 2] as HumanMessage).content).toContain("Failed first time");
  });
});
