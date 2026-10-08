import type { Container } from "../components/container.js";
import type {
  AppState,
  AgentContext,
  RouterContext,
  RagContext,
  AgentContextUpdate,
  RouterContextUpdate,
  RagContextUpdate,
  ToolContext,
  ToolContextUpdate,
  ModelRequest,
  ModelResponse,
  GuardrailContext,
  GuardrailContextUpdate,
  PiiPolicyContext,
  PiiPolicyContextUpdate,
  WorkflowActionContext,
  WorkflowActionContextUpdate,
  ChannelContext,
  ChannelContextUpdate,
} from "./observability.js";

export class ObserverManager {
  private instances: any[] = [];

  constructor(containerInstances: any[]) {
    this.instances = containerInstances;
  }

  private async dispatch(methodName: string, ...args: any[]): Promise<void> {
    for (const instance of this.instances) {
      if (typeof instance[methodName] === "function") {
        await instance[methodName](...args);
      }
    }
  }

  async onWorkflowStart(state: AppState) {
    return this.dispatch("onWorkflowStart", state);
  }
  async onWorkflowEnd(result: unknown, state: AppState) {
    return this.dispatch("onWorkflowEnd", result, state);
  }

  async onAgentStart(ctx: AgentContext) {
    return this.dispatch("onAgentStart", ctx);
  }
  async onAgentEnd(ctx: AgentContextUpdate) {
    return this.dispatch("onAgentEnd", ctx);
  }

  async onRouterStart(ctx: RouterContext) {
    return this.dispatch("onRouterStart", ctx);
  }
  async onRouterEnd(ctx: RouterContextUpdate) {
    return this.dispatch("onRouterEnd", ctx);
  }

  async onToolStart(ctx: ToolContext) {
    return this.dispatch("onToolStart", ctx);
  }
  async onToolEnd(ctx: ToolContextUpdate) {
    return this.dispatch("onToolEnd", ctx);
  }

  async onModelStart(req: ModelRequest) {
    return this.dispatch("onModelStart", req);
  }
  async onModelEnd(res: ModelResponse) {
    return this.dispatch("onModelEnd", res);
  }

  async onRagStart(ctx: RagContext) {
    return this.dispatch("onRagStart", ctx);
  }
  async onRagEnd(ctx: RagContextUpdate) {
    return this.dispatch("onRagEnd", ctx);
  }

  async onGuardrailStart(ctx: GuardrailContext) {
    return this.dispatch("onGuardrailStart", ctx);
  }
  async onGuardrailEnd(ctx: GuardrailContextUpdate) {
    return this.dispatch("onGuardrailEnd", ctx);
  }

  async onPiiPolicyStart(ctx: PiiPolicyContext) {
    return this.dispatch("onPiiPolicyStart", ctx);
  }
  async onPiiPolicyEnd(ctx: PiiPolicyContextUpdate) {
    return this.dispatch("onPiiPolicyEnd", ctx);
  }

  async onActionStart(ctx: WorkflowActionContext) {
    return this.dispatch("onActionStart", ctx);
  }
  async onActionEnd(ctx: WorkflowActionContextUpdate) {
    return this.dispatch("onActionEnd", ctx);
  }

  async onChannelStart(ctx: ChannelContext) {
    return this.dispatch("onChannelStart", ctx);
  }
  async onChannelEnd(ctx: ChannelContextUpdate) {
    return this.dispatch("onChannelEnd", ctx);
  }

  async onError(error: Error, state: AppState) {
    return this.dispatch("onError", error, state);
  }
}
