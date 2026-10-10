import type { BaseMessage, MessageContent } from "@langchain/core/messages";
import type { JudgeVerdict } from "../components/judge-decorators.js";
import type { FlowStateType, FlowStateUpdate } from "../graph/flow-state.js";
import type { AgentStateUpdate } from "../graph/state.js";
import type { RagRetrieval } from "../rag/types.js";

/**
 * The payloads observer hooks receive (`@Workflow({ observers })`). Each event names the node it
 * is about and carries the run's `AppState`.
 */
export interface AppState {
  readonly runId: string;
  readonly threadId?: string;
  /** Name of the current agent, router, tool's agent or action. */
  readonly activeNode?: string;
  readonly variables?: Readonly<Record<string, unknown>>;
  readonly history?: readonly unknown[];
}

/** The start of a named step (agent, router, knowledge base, guardrail, policy, action, channel). */
interface StartEvent<I> {
  readonly name: string;
  readonly input: I;
  readonly state: AppState;
}

/** The end of a named step, with what it produced. */
interface EndEvent<U> {
  readonly name: string;
  readonly update: U;
  readonly state: AppState;
}

/** An agent starts: `input` is the run's task text. */
export type AgentStartEvent = StartEvent<string>;
/** An agent finished: `update` is what it wrote to the flow state. */
export type AgentEndEvent = EndEvent<FlowStateUpdate>;

/** A router starts: `input` is the run's task text. */
export type RouterStartEvent = StartEvent<string>;
/** A router decided: `update` holds `next`, `routeReason` and the router's usage. */
export type RouterEndEvent = EndEvent<FlowStateUpdate>;

/** A knowledge base (`@Rag`, context mode) is searched: `input` is the query. */
export type RagStartEvent = StartEvent<string>;
/** A knowledge base answered. */
export type RagEndEvent = EndEvent<RagRetrieval>;

/** A tool is called by an agent, with the model's (validated) arguments. */
export interface ToolStartEvent {
  readonly toolName: string;
  readonly agentName: string;
  readonly arguments: Readonly<Record<string, unknown>>;
  readonly state: AppState;
}

/** A tool returned: `update` is the text the model sees. */
export interface ToolEndEvent {
  readonly toolName: string;
  readonly agentName: string;
  readonly update: string;
  readonly state: AppState;
}

/** What a guardrail is shown: the judge point, its context and (on a channel) the decision. */
export interface GuardrailInput {
  readonly point: string;
  readonly ctx: unknown;
  readonly decision?: unknown;
}
export type GuardrailStartEvent = StartEvent<GuardrailInput>;
/** A guardrail ran: `update` is what it returned (a verdict, overrides, or nothing). */
export type GuardrailEndEvent = EndEvent<unknown>;

/** The human's feedback and argument overrides, before and after a PII policy masked them. */
export interface PiiPolicyPayload {
  readonly feedback?: string;
  readonly overrideArgs?: unknown;
}
export type PiiPolicyStartEvent = StartEvent<PiiPolicyPayload>;
export type PiiPolicyEndEvent = EndEvent<PiiPolicyPayload>;

/** A `@WorkflowAction` (or a nested workflow) starts with the flow state. */
export type ActionStartEvent = StartEvent<FlowStateType>;
/** An action finished: `update` is what it wrote to the flow state. */
export type ActionEndEvent = EndEvent<FlowStateUpdate | Partial<AgentStateUpdate>>;

/** An approval request goes out on a channel: `input` is the tool call's arguments. */
export type ChannelStartEvent = StartEvent<unknown>;
/** A channel answered: `update` is the raw decision, before the channel's adapter reads it. */
export type ChannelEndEvent = EndEvent<unknown>;

/** A model is called by an agent (`callerName`) with the conversation so far. */
export interface ModelStartEvent {
  readonly modelName: string;
  readonly callerName: string;
  readonly rawPayload: readonly BaseMessage[];
  readonly state: AppState;
}

/** A model answered: its content, token usage and cost. */
export interface ModelEndEvent {
  readonly model: string;
  readonly callerName: string;
  readonly rawContent: MessageContent;
  readonly usage: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
  readonly calculatedCost?: number;
  readonly state: AppState;
}

/** A judge evaluates an agent's reply (`input`). */
export interface JudgeStartEvent {
  readonly name: string;
  readonly agentName: string;
  readonly input: unknown;
  readonly state: AppState;
}

/** A judge's verdict. */
export interface JudgeEndEvent {
  readonly name: string;
  readonly agentName: string;
  readonly update: JudgeVerdict;
  readonly state: AppState;
}
