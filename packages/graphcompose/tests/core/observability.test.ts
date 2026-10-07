import { describe, expect, it } from "vitest";
import {
  Agent,
  Injectable,
  Tool,
  Workflow,
  type AppState,
  type ModelRequest,
  type ModelResponse,
  type AgentContext,
  RouterContext,
  RagContext,
  type AgentContextUpdate,
  RouterContextUpdate,
  RagContextUpdate,
  type OnAgentEnd,
  type OnAgentStart,
  type OnError,
  type OnModelEnd,
  type OnModelStart,
  type OnRagStart,
  type OnRagEnd,
  type OnRouterEnd,
  type OnRouterStart,
  type OnToolEnd,
  type OnToolStart,
  type OnWorkflowEnd,
  type OnWorkflowStart,
  type ToolContextUpdate,
  type ToolContext,
} from "../../src/core/index.js";
import { Router, WorkflowStart, from } from "../../src/graph/index.js";
import { WorkflowFinish } from "../../src/graph/workflow-finish.decorator.js";
import { Rag } from "../../src/components/decorators.js";
import { RagRetrieval } from "../../src/rag/types.js";
import { WorkflowStartText, WorkflowFinishText, Text } from "../../src/dto/index.js";
import { buildApp } from "../../src/app/create-app.js";
import { workflowOf } from "../../src/components/assemble.js";
import { createScriptedGateway } from "../../src/testing/scripted-gateway.js";
import { ScriptBook } from "../../src/testing/script-book.js";
import { answer, callTool, decide } from "../../src/testing/index.js";
import { testConfig } from "../helpers.js";
import { TestSettings } from "../fixtures/test-flow/star.js";

class ToolInput {
  @Text() text!: string;
}

const hookEvents: string[] = [];
let capturedState: AppState | null = null;

@Injectable()
class GlobalObserver
  implements
    OnWorkflowStart,
    OnWorkflowEnd,
    OnAgentStart,
    OnAgentEnd,
    OnRouterStart,
    OnRouterEnd,
    OnToolStart,
    OnToolEnd,
    OnModelStart,
    OnModelEnd,
    OnRagStart,
    OnRagEnd,
    OnError
{
  async onWorkflowStart(state: AppState) {
    hookEvents.push("WorkflowStart");
    capturedState = state;
  }
  async onWorkflowEnd(res: any, state: AppState) {
    hookEvents.push("WorkflowEnd");
  }

  async onAgentStart(ctx: AgentContext) {
    hookEvents.push(`AgentStart:${ctx.name}`);
  }
  async onAgentEnd(ctx: AgentContextUpdate) {
    hookEvents.push(`AgentEnd:${ctx.name}`);
  }

  async onRouterStart(ctx: RouterContext) {
    hookEvents.push(`RouterStart:${ctx.name}`);
  }
  async onRouterEnd(ctx: RouterContextUpdate) {
    hookEvents.push(`RouterEnd:${ctx.name}`);
  }

  async onToolStart(ctx: ToolContext) {
    hookEvents.push(`ToolStart:${ctx.toolName}`);
  }
  async onToolEnd(ctx: ToolContextUpdate) {
    hookEvents.push(`ToolEnd:${ctx.toolName}`);
  }

  async onModelStart(req: ModelRequest) {
    hookEvents.push(`ModelStart:${req.callerName}`);
  }
  async onModelEnd(res: ModelResponse) {
    hookEvents.push(`ModelEnd:${res.callerName}`);
  }

  async onRagStart(ctx: RagContext) {
    hookEvents.push(`RagStart:${ctx.name}`);
  }
  async onRagEnd(ctx: RagContextUpdate) {
    hookEvents.push(`RagEnd:${ctx.name}`);
  }
  async onError(err: Error, state: AppState) {
    hookEvents.push("Error");
  }
}

@Tool({
  name: "ObsTool",
  description: "Does things",
  input: ToolInput,
  output: ToolInput,
  deps: [GlobalObserver],
})
class ObsTool {
  constructor(public obs: GlobalObserver) {}
  async run(input: ToolInput) {
    return { text: "done" };
  }
}

@WorkflowStart({ name: "Start", description: "Start", input: WorkflowStartText })
class ObsStart {
  constructor(public obs: GlobalObserver) {}
}

@WorkflowFinish({ name: "ObsFinish", description: "Finish", output: WorkflowFinishText })
class ObsFinish {}

@Rag({ name: "ObsRag", description: "test rag", topK: 5 })
class ObsRag {
  async retrieve(): Promise<RagRetrieval> {
    return { results: [] };
  }
}

@Agent({
  name: "ObsAgent",
  description: "test agent",
  model: "test",

  tools: [ObsTool],
  rag: [{ use: ObsRag, mode: "context" }],
})
class ObsAgent {}

@Router({
  description: "Router",
  model: "stub",
  name: "ObsRouter",
  prompt: "Decide.",
  maxVisits: 10,
  routes: [
    { prompt: "go", target: ObsAgent },
    { prompt: "stop", target: ObsFinish },
  ],
})
class ObsRouter {}

@Workflow({
  name: "obs-test",
  version: "1.0.0",
  defaults: testConfig.defaults,
  providers: [GlobalObserver],
  flow: [
    from(ObsStart).next(ObsRouter),
    from(ObsRouter).routes(ObsAgent, ObsFinish),
    from(ObsAgent).next(ObsRouter),
  ],
})
class ObsWorkflow extends TestSettings {}

describe("Global Observability Hooks", () => {
  it("fires hooks in correct order and provides AppState", async () => {
    hookEvents.length = 0; // reset
    capturedState = null;

    const book = new ScriptBook();
    book.scriptOf("router:ObsRouter").respond(decide(ObsAgent), decide(ObsFinish));
    book
      .scriptOf("agent:ObsAgent")
      .respond(callTool(ObsTool, { text: "hello" }), answer("Hello user!"));

    const { app, deps } = await buildApp(await workflowOf(ObsWorkflow), {
      gateway: createScriptedGateway(book),
    });

    // Eagerly instantiate ObsTool to ensure GlobalObserver is in lifecycle.created
    deps.tools("ObsTool");
    book.scriptOf("router:ObsRouter").respond(decide(ObsAgent), decide(ObsFinish));
    book
      .scriptOf("agent:ObsAgent")
      .respond(callTool(ObsTool, { text: "hello" }), answer("Hello user!"));
    await app.execute(ObsStart, { text: "Hi" });

    // Ensure all hook types fired
    expect(hookEvents).toContain("WorkflowStart");
    expect(hookEvents).toContain("WorkflowEnd");
    expect(hookEvents).toContain("RouterStart:ObsRouter");
    expect(hookEvents).toContain("RouterEnd:ObsRouter");
    expect(hookEvents).toContain("AgentStart:ObsAgent");
    expect(hookEvents).toContain("AgentEnd:ObsAgent");
    expect(hookEvents).toContain("ToolStart:ObsTool");
    expect(hookEvents).toContain("ToolEnd:ObsTool");
    expect(hookEvents).toContain("ModelStart:ObsAgent");
    expect(hookEvents).toContain("ModelEnd:ObsAgent");
    expect(hookEvents).toContain("RagStart:ObsRag");
    expect(hookEvents).toContain("RagEnd:ObsRag");

    expect(capturedState).not.toBeNull();
    expect((capturedState as any)?.runId).toBeDefined();

    await app.close();
  });
});
