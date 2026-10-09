export interface AppState {
  readonly runId: string;
  readonly threadId?: string;
  readonly activeNode?: string; // name of the current Agent or Router
  readonly variables?: Record<string, unknown>;
  readonly history?: unknown[];
}

export interface AgentContext<I = unknown> {
  readonly name: string;
  readonly input: I;
  readonly state: AppState;
}
export interface AgentContextUpdate<U = unknown> {
  readonly name: string;
  readonly update: U;
  readonly state: AppState;
}

export interface RouterContext<I = unknown> {
  readonly name: string;
  readonly input: I;
  readonly state: AppState;
}
export interface RouterContextUpdate<U = unknown> {
  readonly name: string;
  readonly update: U;
  readonly state: AppState;
}

export interface RagContext<I = unknown> {
  readonly name: string;
  readonly input: I;
  readonly state: AppState;
}
export interface RagContextUpdate<U = unknown> {
  readonly name: string;
  readonly update: U;
  readonly state: AppState;
}

export interface ToolContext<A = unknown> {
  readonly toolName: string;
  readonly agentName: string;
  readonly arguments: A;
  readonly state: AppState;
}

export interface ToolContextUpdate<U = unknown> {
  readonly toolName: string;
  readonly agentName: string;
  readonly update: U;
  readonly state: AppState;
}

export interface GuardrailContext<I = unknown> {
  readonly name: string;
  readonly input: I;
  readonly state: AppState;
}
export interface GuardrailContextUpdate<U = unknown> {
  readonly name: string;
  readonly update: U;
  readonly state: AppState;
}

export interface PiiPolicyContext<I = unknown> {
  readonly name: string;
  readonly input: I;
  readonly state: AppState;
}
export interface PiiPolicyContextUpdate<U = unknown> {
  readonly name: string;
  readonly update: U;
  readonly state: AppState;
}

export interface WorkflowActionContext<I = unknown> {
  readonly name: string;
  readonly input: I;
  readonly state: AppState;
}
export interface WorkflowActionContextUpdate<U = unknown> {
  readonly name: string;
  readonly update: U;
  readonly state: AppState;
}

export interface ChannelContext<I = unknown> {
  readonly name: string;
  readonly input: I;
  readonly state: AppState;
}
export interface ChannelContextUpdate<U = unknown> {
  readonly name: string;
  readonly update: U;
  readonly state: AppState;
}

export interface ModelRequest {
  readonly modelName: string;
  readonly callerName: string; // The Agent, Router, or Rag that invoked the model
  readonly rawPayload: unknown;
  readonly state: AppState;
}

export interface ModelResponse {
  readonly model: string;
  readonly callerName: string;
  readonly rawContent: unknown;
  readonly usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  readonly calculatedCost?: number;
  readonly state: AppState;
}

// --- UNIVERSAL OBSERVABILITY HOOKS ---

// 1. Workflow Level
export interface OnWorkflowStart {
  onWorkflowStart(state: AppState): Promise<void> | void;
}
export interface OnWorkflowEnd {
  onWorkflowEnd(result: unknown, state: AppState): Promise<void> | void;
}

// 2. Agent Level
export interface OnAgentStart {
  onAgentStart(ctx: AgentContext): Promise<void> | void;
}
export interface OnAgentEnd {
  onAgentEnd(ctx: AgentContextUpdate): Promise<void> | void;
}

// 3. Router Level
export interface OnRouterStart {
  onRouterStart(ctx: RouterContext): Promise<void> | void;
}
export interface OnRouterEnd {
  onRouterEnd(ctx: RouterContextUpdate): Promise<void> | void;
}

// 4. Tool Level
export interface OnToolStart {
  onToolStart(ctx: ToolContext): Promise<void> | void;
}
export interface OnToolEnd {
  onToolEnd(ctx: ToolContextUpdate): Promise<void> | void;
}

// 5. Model/AI Level (Triggers whenever LLM/Embeddings are called, regardless of caller)
export interface OnModelStart {
  onModelStart(request: ModelRequest): Promise<void> | void;
}
export interface OnModelEnd {
  onModelEnd(response: ModelResponse): Promise<void> | void;
}

// 6. RAG Level
export interface OnRagStart {
  onRagStart(ctx: RagContext): Promise<void> | void;
}
export interface OnRagEnd {
  onRagEnd(ctx: RagContextUpdate): Promise<void> | void;
}

// 7. Global Error
export interface OnError {
  onError(error: Error, state: AppState): Promise<void> | void;
}

// 8. Guardrail Level
export interface OnGuardrailStart {
  onGuardrailStart(ctx: GuardrailContext): Promise<void> | void;
}
export interface OnGuardrailEnd {
  onGuardrailEnd(ctx: GuardrailContextUpdate): Promise<void> | void;
}

// 9. PiiPolicy Level
export interface OnPiiPolicyStart {
  onPiiPolicyStart(ctx: PiiPolicyContext): Promise<void> | void;
}
export interface OnPiiPolicyEnd {
  onPiiPolicyEnd(ctx: PiiPolicyContextUpdate): Promise<void> | void;
}

// 10. WorkflowAction Level
export interface OnActionStart {
  onActionStart(ctx: WorkflowActionContext): Promise<void> | void;
}
export interface JudgeContextStart {
  readonly name: string;
  readonly agentName: string;
  readonly input: unknown;
  readonly state: AppState;
}

export interface JudgeContextUpdate {
  readonly name: string;
  readonly agentName: string;
  readonly update: import("../components/judge-decorators.js").JudgeResult;
  readonly state: AppState;
}

export interface OnJudgeStart {
  onJudgeStart(ctx: JudgeContextStart): Promise<void> | void;
}

export interface OnJudgeEnd {
  onJudgeEnd(ctx: JudgeContextUpdate): Promise<void> | void;
}

export interface OnActionEnd {
  onActionEnd(ctx: WorkflowActionContextUpdate): Promise<void> | void;
}

// 11. Channel Level
export interface OnChannelStart {
  onChannelStart(ctx: ChannelContext): Promise<void> | void;
}
export interface OnChannelEnd {
  onChannelEnd(ctx: ChannelContextUpdate): Promise<void> | void;
}
