import { describe, expect } from "vitest";
import { Agent, WorkflowAction, Workflow } from "../../src/components/decorators.js";
import { from } from "../../src/router/index.js";
import { WorkflowStart, WorkflowFinish } from "../../src/graph/index.js";
import { testWith } from "../../src/testing/test-with.js";
import { replyWith } from "../../src/testing/script.js";
import { Text, Nested } from "../../src/dto/index.js";

class PayloadDto {
  @Text() result!: string;
}
class MyState {
  @Text() text!: string;
  @Nested(PayloadDto, { optional: true }) payload?: PayloadDto;
}
@WorkflowStart({ name: "Start", description: "Start", input: MyState })
class Start {}

@WorkflowFinish({ name: "Finish", description: "Finish", output: MyState })
class Finish {}

@Agent({ name: "dummy_agent", model: "gpt-4", description: "Dummy agent", prompt: "Dummy prompt" })
class DummyAgent {}

@WorkflowAction({ name: "subgraph_agent", description: "" })
class SubgraphAgent {
  async execute() {
    return { payload: { result: "insideSubgraph" } };
  }
}

let capturedState: any;
@WorkflowAction({ name: "Logger", description: "" })
class Logger {
  execute(state: any) {
    capturedState = state;
    return {};
  }
}

@Workflow({
  name: "child-workflow",
  version: "1.0.0",
  providers: [Start, Finish, SubgraphAgent, DummyAgent],
  flow: [
    from(Start).nextParallel(SubgraphAgent, DummyAgent),
    from(SubgraphAgent).next(Finish),
    from(DummyAgent).next(Finish),
  ],
  defaults: {
    models: { temperature: 0, maxTokens: 1000, thinking: "default", cache: true },
    router: { kind: "llm", model: "openrouter:openai/gpt-4" },
    tools: { maxToolCalls: 8 },
    history: { limit: 5 },
  },
})
class ChildWorkflow {
  settings = () =>
    ({
      limits: { steps: 50 },
      models: {} as any,
      agents: { dummy_agent: { models: { temperature: 0 } } },
    }) as unknown as import("../../src/graph/settings.js").WorkflowSettings;
}

@WorkflowAction({ name: "parent_agent", description: "" })
class ParentAgent {
  async execute() {
    return { payload: { result: "inParent" } };
  }
}

@Workflow({
  name: "parent-workflow",
  version: "1.0.0",
  providers: [Start, Finish, ParentAgent, ChildWorkflow, DummyAgent, SubgraphAgent, Logger],
  flow: [
    from(Start).next(ParentAgent),
    from(ParentAgent).next(DummyAgent),
    from(DummyAgent).next(ChildWorkflow),
    from(ChildWorkflow).next(Logger),
    from(Logger).next(Finish),
  ],
  defaults: {
    models: { temperature: 0, maxTokens: 1000, thinking: "default", cache: true },
    router: { kind: "llm", model: "openrouter:openai/gpt-4" },
    tools: { maxToolCalls: 8 },
    history: { limit: 5 },
  },
})
class ParentWorkflow {
  settings = () =>
    ({
      limits: { steps: 50 },
      models: {} as any,
      agents: { dummy_agent: { models: { temperature: 0 } } },
    }) as unknown as import("../../src/graph/settings.js").WorkflowSettings;
}

const test = testWith(ParentWorkflow);

describe("Nested Workflows (Subgraphs)", () => {
  test("executes subgraph and merges payload", async ({ app, mockLlm, mockSubworkflow }) => {
    mockLlm(DummyAgent).thenReturnAlways(replyWith("dummy"));
    mockSubworkflow(ChildWorkflow).mockResolvedValue({ payload: { result: "insideSubgraph" } });
    const res = await app.execute(Start, { text: "hello" });
    expect(res.status).toBe("answered");

    expect(res.path.map((p) => p.name)).toContain("ParentAgent");
    expect(res.path.map((p) => p.name)).toContain("ChildWorkflow");

    expect(capturedState.payload).toMatchObject({ result: "insideSubgraph" });

    expect(res.path.length).toBeGreaterThan(0);
  });
});
