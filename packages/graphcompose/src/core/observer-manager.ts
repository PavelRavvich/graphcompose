// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private instances: any[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(containerInstances: any[]) {
    this.instances = containerInstances;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async dispatch(methodName: string, ...args: any[]): Promise<void> {
    for (const instance of this.instances) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (typeof instance[methodName] === "function") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await instance[methodName](...args);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async onWorkflowStart(state: AppState) {
    return this.dispatch("onWorkflowStart", state);
  }
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async onWorkflowEnd(result: unknown, state: AppState) {
    return this.dispatch("onWorkflowEnd", result, state);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async onAgentStart(ctx: AgentContext) {
    return this.dispatch("onAgentStart", ctx);
  }
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async onAgentEnd(ctx: AgentContextUpdate) {
    return this.dispatch("onAgentEnd", ctx);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async onRouterStart(ctx: RouterContext) {
    return this.dispatch("onRouterStart", ctx);
  }
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async onRouterEnd(ctx: RouterContextUpdate) {
    return this.dispatch("onRouterEnd", ctx);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async onToolStart(ctx: ToolContext) {
    return this.dispatch("onToolStart", ctx);
  }
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async onToolEnd(ctx: ToolContextUpdate) {
    return this.dispatch("onToolEnd", ctx);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async onModelStart(req: ModelRequest) {
    return this.dispatch("onModelStart", req);
  }
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async onModelEnd(res: ModelResponse) {
    return this.dispatch("onModelEnd", res);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async onRagStart(ctx: RagContext) {
    return this.dispatch("onRagStart", ctx);
  }
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async onRagEnd(ctx: RagContextUpdate) {
    return this.dispatch("onRagEnd", ctx);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async onGuardrailStart(ctx: GuardrailContext) {
    return this.dispatch("onGuardrailStart", ctx);
  }
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async onGuardrailEnd(ctx: GuardrailContextUpdate) {
    return this.dispatch("onGuardrailEnd", ctx);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async onPiiPolicyStart(ctx: PiiPolicyContext) {
    return this.dispatch("onPiiPolicyStart", ctx);
  }
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async onPiiPolicyEnd(ctx: PiiPolicyContextUpdate) {
    return this.dispatch("onPiiPolicyEnd", ctx);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async onActionStart(ctx: WorkflowActionContext) {
    return this.dispatch("onActionStart", ctx);
  }
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async onActionEnd(ctx: WorkflowActionContextUpdate) {
    return this.dispatch("onActionEnd", ctx);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async onChannelStart(ctx: ChannelContext) {
    return this.dispatch("onChannelStart", ctx);
  }
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async onChannelEnd(ctx: ChannelContextUpdate) {
    return this.dispatch("onChannelEnd", ctx);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async onJudgeStart(ctx: import("./observability.js").JudgeContextStart) {
    return this.dispatch("onJudgeStart", ctx);
  }
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async onJudgeEnd(ctx: import("./observability.js").JudgeContextUpdate) {
    return this.dispatch("onJudgeEnd", ctx);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async onError(error: Error, state: AppState) {
    return this.dispatch("onError", error, state);
  }
}
