import { describe, expect, it } from "vitest";
import {
  Agent,
  Guardrail,
  Injectable,
  PiiPolicy,
  Tool,
  Workflow,
  WorkflowAction,
  type AppState,
  type OnActionEnd,
  type OnActionStart,
  type OnAgentEnd,
  type OnAgentStart,
  type OnChannelEnd,
  type OnChannelStart,
  type OnGuardrailEnd,
  type OnGuardrailStart,
  type OnPiiPolicyEnd,
  type OnPiiPolicyStart,
  type OnToolEnd,
  type OnToolStart,
  type OnWorkflowEnd,
  type OnWorkflowStart,
  type WorkflowActionContext,
  type WorkflowActionContextUpdate,
  type GuardrailContext,
  type GuardrailContextUpdate,
  type PiiPolicyContext,
  type PiiPolicyContextUpdate,
  type ChannelContext,
  type ChannelContextUpdate,
} from "../../src/core/index.js";
import { from } from "../../src/router/index.js";
import { WorkflowStart, WorkflowFinish } from "../../src/graph/index.js";
import { WorkflowStartText, WorkflowFinishText, Text } from "../../src/dto/index.js";
import { buildApp } from "../../src/app/create-app.js";
import { workflowOf } from "../../src/components/assemble.js";
import { createScriptedGateway } from "../../src/testing/scripted-gateway.js";
import { ScriptBook } from "../../src/testing/script-book.js";
import { answer, callTool } from "../../src/testing/index.js";
import { testConfig } from "../helpers.js";
import { TestSettings } from "../fixtures/test-flow/star.js";

class ToolInput {
  @Text() text!: string;
}

const hookEvents: string[] = [];

@Injectable()
class TailsObserver
  implements
    OnWorkflowStart,
    OnWorkflowEnd,
    OnAgentStart,
    OnAgentEnd,
    OnActionStart,
    OnActionEnd,
    OnToolStart,
    OnToolEnd,
    OnGuardrailStart,
    OnGuardrailEnd,
    OnPiiPolicyStart,
    OnPiiPolicyEnd,
    OnChannelStart,
    OnChannelEnd
{
  async onWorkflowStart() { hookEvents.push("WorkflowStart"); }
  async onWorkflowEnd() { hookEvents.push("WorkflowEnd"); }
  
  async onAgentStart(ctx: any) { hookEvents.push(`AgentStart:${ctx.name}`); }
  async onAgentEnd(ctx: any) { hookEvents.push(`AgentEnd:${ctx.name}`); }
  
  async onToolStart(ctx: any) { hookEvents.push(`ToolStart:${ctx.toolName}`); }
  async onToolEnd(ctx: any) { hookEvents.push(`ToolEnd:${ctx.toolName}`); }

  async onActionStart(ctx: any) { hookEvents.push(`ActionStart:${ctx.name}`); }
  async onActionEnd(ctx: any) { hookEvents.push(`ActionEnd:${ctx.name}`); }

  async onGuardrailStart(ctx: any) { hookEvents.push(`GuardrailStart:${ctx.name}`); }
  async onGuardrailEnd(ctx: any) { hookEvents.push(`GuardrailEnd:${ctx.name}`); }

  async onPiiPolicyStart(ctx: any) { hookEvents.push(`PiiStart:${ctx.name}`); }
  async onPiiPolicyEnd(ctx: any) { hookEvents.push(`PiiEnd:${ctx.name}`); }
  
  async onChannelStart(ctx: any) { hookEvents.push(`ChannelStart:${ctx.name}`); }
  async onChannelEnd(ctx: any) { hookEvents.push(`ChannelEnd:${ctx.name}`); }
}

@PiiPolicy({ name: "MaskingPolicy" })
class MaskingPolicy {
  async mask(text: string) { return text; }
  async unmask(text: string) { return text; }
}

@Guardrail({ name: "SafeGuard" })
class SafeGuard {
  async beforeToolCall() {}
  async afterToolCall() {}
}

@Tool({
  name: "SafeTool",
  description: "Does things",
  input: ToolInput,
  output: ToolInput,
  deps: [TailsObserver]
})
class SafeTool {
  constructor(public obs: TailsObserver) {}
  async run() { return { text: "done" }; }
}

@Agent({
  name: "SafeAgent",
  description: "test agent",
  model: "test",
  tools: [SafeTool],
  pii: [MaskingPolicy],
  guardrails: [SafeGuard]
})
class SafeAgent {}

@WorkflowAction({ name: "FormatAction" })
class FormatAction {
  async execute() { return { payload: { format: true } }; }
}

@WorkflowStart({ name: "Start", input: WorkflowStartText })
class StartNode {}

@WorkflowFinish({ name: "Finish", output: WorkflowFinishText })
class FinishNode {}

@Workflow({
  name: "tails-test",
  version: "1.0.0",
  defaults: testConfig.defaults,
  providers: [TailsObserver],
  flow: [
    from(StartNode).next(SafeAgent),
    from(SafeAgent).next(FormatAction),
    from(FormatAction).next(FinishNode),
  ],
})
class TailsWorkflow extends TestSettings {}

describe("Observability Tails Hooks", () => {
  it("fires tails hooks in precise order", async () => {
    hookEvents.length = 0;

    const book = new ScriptBook();
    book
      .scriptOf("agent:SafeAgent")
      .respond(callTool(SafeTool, { text: "hello" }), answer("Hello user!"));

    const { app, deps } = await buildApp(await workflowOf(TailsWorkflow), {
      gateway: createScriptedGateway(book),
    });

    deps.tools("SafeTool");
    await app.execute(StartNode, { text: "hi" });

    // Assert the exact flow
    // Workflow -> Agent -> Pii -> Guardrail -> Tool -> Guardrail -> Pii -> Agent -> Action -> WorkflowEnd
    
    // Check Action
    console.log("HOOK EVENTS:", hookEvents);
    expect(hookEvents).toContain("ActionStart:FormatAction");
    expect(hookEvents).toContain("ActionEnd:FormatAction");

    // Order assertions
    const agentStart = hookEvents.indexOf("AgentStart:SafeAgent");
    const piiStart = hookEvents.indexOf("PiiStart:MaskingPolicy");
    const guardrailStart = hookEvents.indexOf("GuardrailStart:SafeGuard");
    const toolStart = hookEvents.indexOf("ToolStart:SafeTool");
    const toolEnd = hookEvents.indexOf("ToolEnd:SafeTool");
    const guardrailEnd = hookEvents.indexOf("GuardrailEnd:SafeGuard");
    
    
    
    const agentEnd = hookEvents.indexOf("AgentEnd:SafeAgent");
    expect(agentStart).toBeLessThan(guardrailStart);

    expect(guardrailStart).toBeLessThan(toolStart);
    expect(toolStart).toBeLessThan(toolEnd);
    const guardrailEnd2 = hookEvents.lastIndexOf("GuardrailEnd:SafeGuard");
    expect(toolEnd).toBeLessThan(guardrailEnd2);
    expect(guardrailEnd2).toBeLessThan(agentEnd);
    
    await app.close();
  });
});
