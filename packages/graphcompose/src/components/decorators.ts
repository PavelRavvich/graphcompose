import type { McpServerConfig } from "../config/types.js";
import type { RagConnector } from "../rag/types.js";
import type { DtoClass } from "../dto/types.js";
import type { ToolContext } from "../tools/index.js";
import type { ChannelMeta } from "./meta-types.js";
import type { Class, ResolvedAll, Token } from "./injection.js";
import { callerFile } from "./call-site.js";
import type { McpServerClient, ServerTools } from "./mcp-client.js";
import { recordComponent } from "./metadata.js";
import type { AgentMeta, WorkflowMeta, WorkflowActionMeta } from "./meta-types.js";
import type { AgentState, AgentStateUpdate } from "../graph/state.js";
import type { WorkflowDefinition } from "../graph/settings.js";

/**
 * The contract of a tool (`@Tool`, `@McpTool`): `implements ToolHandler<OrderQuery, OrderStatus>` — its
 * input and output DTOs (classes from `graphcompose/dto`).
 */
export interface ToolHandler<TInput, TOutput> {
  run: (input: TInput, ctx: ToolContext) => Promise<TOutput>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { PromptOptions } from "./prompt-options.js";

export interface ToolOptions<
  In extends DtoClass,
  Out extends DtoClass,
  D extends readonly Token[],
> {
  readonly name: string;
  readonly description: string;
  readonly prompt?: string;
  readonly promptUrls?: readonly string[];
  readonly channel?: Class;
  readonly timeoutMs?: number;
  readonly piiPolicies?: readonly Class[];
  readonly guardrails?: readonly Class[];
  readonly overridePiiPolicies?: readonly Class[];
  readonly disablePiiPolicies?: readonly Class[];
  readonly overrideGuardrails?: readonly Class[];
  readonly disableGuardrails?: readonly Class[];
  readonly input: In;
  readonly output: Out;
  /** Constructor dependencies, in order; checked against the constructor by the compiler. */
  readonly deps?: D;
}

/** A tool: one class implementing `ToolHandler`, dependencies through the constructor. */
export function Tool<
  In extends DtoClass,
  Out extends DtoClass,
  const D extends readonly Token[] = [],
>(options: ToolOptions<In, Out, D>) {
  return <
    C extends new (...args: ResolvedAll<D>) => ToolHandler<InstanceType<In>, InstanceType<Out>>,
  >(
    value: C,
  ): C => {
    recordComponent(value, { kind: "tool", meta: { ...options, deps: options.deps ?? [] } });
    return value;
  };
}

/** A class the container creates for others (a judge, a client, …). */
export function Injectable<const D extends readonly Token[] = []>(
  options: { readonly deps?: D } = {},
) {
  return <C extends new (...args: ResolvedAll<D>) => object>(value: C): C => {
    recordComponent(value, { kind: "injectable", meta: { deps: options.deps ?? [] } });
    return value;
  };
}

/**
 * An MCP server the workflow connects to: its launch config and the server tools the workflow uses
 * (`tools`), which type the class's `call` (`extends McpServerClient<typeof tools>`).
 */
export function McpServer<const TTools extends ServerTools>(
  options: { readonly name: string; readonly tools: TTools } & McpServerConfig,
) {
  return <C extends new () => McpServerClient<TTools>>(value: C): C => {
    const { name, tools, ...config } = options;
    recordComponent(value, { kind: "mcp-server", meta: { name, config, tools } });
    return value;
  };
}

/**
 * A tool backed by an MCP server: like `@Tool` (implements `ToolHandler`, dependencies through the
 * constructor) with its server's client among `deps`; `run` calls the server's tools through it.
 */
export function McpTool<
  In extends DtoClass,
  Out extends DtoClass,
  const D extends readonly Token[] = [],
>(options: ToolOptions<In, Out, D> & { readonly server: Class }) {
  return <
    C extends new (...args: ResolvedAll<D>) => ToolHandler<InstanceType<In>, InstanceType<Out>>,
  >(
    value: C,
  ): C => {
    const { server, ...tool } = options;
    recordComponent(value, { kind: "mcp-tool", meta: { ...tool, deps: tool.deps ?? [], server } });
    return value;
  };
}

/**
 * A knowledge base: a class implementing `RagConnector`. `topK` (passages per retrieval) is required —
 * there is no default. Agents bind it with a required `mode`: `rag: [{ use: CompanyDocs, mode: "tool" }]`.
 */
export function Rag<const D extends readonly Token[] = []>(options: {
  readonly name: string;
  readonly description: string;
  readonly topK: number;
  readonly prompt?: string;
  readonly promptUrls?: readonly string[];
  readonly deps?: D;
}) {
  return <C extends new (...args: ResolvedAll<D>) => RagConnector>(value: C): C => {
    recordComponent(value, { kind: "rag", meta: { ...options, deps: options.deps ?? [] } });
    return value;
  };
}

/** An agent: its settings, its tools (class references) and its prompt file. */
export function Agent(options: Omit<AgentMeta, "source">) {
  const source = callerFile();
  return <C extends Class>(value: C): C => {
    recordComponent(value, {
      kind: "agent",
      meta: { ...options, ...(source === undefined ? {} : { source }) },
    });
    return value;
  };
}

/**
 * The module of a workflow (Angular `@NgModule`-like): its flow and settings. The class
 * `implements WorkflowDefinition` (`settings()`). Assemble with `workflowOf`.
 */
export function Workflow(options: WorkflowMeta) {
  return <C extends new () => WorkflowDefinition>(value: C): C => {
    recordComponent(value, { kind: "workflow", meta: options });
    return value;
  };
}

export interface ActionRuntime<TExec = unknown> {
  readonly executionContext?: TExec;
  readonly runId: string;
  /** Unique key combining runId and node name for safe external API calls */
  readonly idempotencyKey?: string;
  readonly signal?: AbortSignal;
  readonly getComponentClass?: (nodeName: string) => Class | undefined | Promise<Class | undefined>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly runCompensation?: (component: Class, state: any, nodeName?: string) => Promise<any>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface IWorkflowAction<T = any> {
  execute(
    state: AgentState<T>,
    context: ActionRuntime,
  ): Promise<Partial<AgentStateUpdate>> | Partial<AgentStateUpdate>;
}

/**
 * A programmatic flow node (no LLM): a class implementing `IWorkflowAction`, dependencies through the
 * constructor — `deps` are checked against it by the compiler, like `@Tool`.
 */
export function WorkflowAction<const D extends readonly Token[] = []>(
  options: WorkflowActionMeta & { readonly deps?: D },
) {
  return <C extends new (...args: ResolvedAll<D>) => IWorkflowAction>(value: C): C => {
    recordComponent(value, { kind: "action", meta: { ...options, deps: options.deps ?? [] } });
    return value;
  };
}

export interface ChannelRequest<T = Record<string, unknown>> {
  readonly runId: string;
  readonly agentName: string;
  readonly toolName: string;
  readonly toolArguments: T;
  /** Any custom metadata passed when the run started (e.g., ownerId, tenantId). */
  readonly metadata: Record<string, unknown>;
  readonly executionContext?: unknown;
}

export interface ChannelDecision {
  readonly approved: boolean;
  /** Sent back to the LLM if rejected. */
  readonly feedback?: string;
  /** Overrides the tool arguments with new values, bypassing the LLM. */
  readonly overrideArguments?: Record<string, unknown>;
}

export interface ChannelHandler<T = Record<string, unknown>> {
  requestApproval: (req: ChannelRequest<T>) => Promise<void>;
}

export function Channel<const D extends readonly Token[] = []>(
  options: ChannelMeta & { readonly deps?: D },
) {
  return <C extends new (...args: ResolvedAll<D>) => ChannelHandler>(value: C): C => {
    recordComponent(value, {
      kind: "channel",
      meta: { ...options, deps: options.deps ?? [] },
    });
    return value;
  };
}

export {
  Guardrail,
  InboundChannelAdapter,
  PiiPolicy,
  SemanticInboundChannelAdapter,
  type GuardrailContext,
  type SemanticAdapterOptions,
} from "./policy-decorators.js";
export {
  BindTool,
  getBoundTools,
  type BindToolOptions,
  type BoundToolConfig,
} from "./bind-tool.js";
