import type { z } from "zod";
import type { McpServerConfig } from "../config/types.js";
import type { RagConnector } from "../rag/types.js";
import type { ToolContext, ToolEffect } from "../tools/index.js";
import type { Class, ResolvedAll, Token } from "./injection.js";
import { recordComponent } from "./metadata.js";
import type { AgentMeta, WorkflowMeta } from "./meta-types.js";

/** What a `@Tool` class implements — the compiler checks `run` against the schemas. */
export interface ToolHandler<In extends z.ZodType, Out extends z.ZodType> {
  run(input: z.output<In>, ctx: ToolContext): Promise<z.input<Out>>;
}

interface ToolOptions<In extends z.ZodType, Out extends z.ZodType, D extends readonly Token[]> {
  readonly name: string;
  readonly description: string;
  readonly effect?: ToolEffect;
  readonly timeoutMs?: number;
  readonly input: In;
  readonly output: Out;
  /** Constructor dependencies, in order; checked against the constructor by the compiler. */
  readonly deps?: D;
}

/** A tool: one class implementing `ToolHandler`, dependencies through the constructor. */
export function Tool<
  In extends z.ZodType,
  Out extends z.ZodType,
  const D extends readonly Token[] = [],
>(options: ToolOptions<In, Out, D>) {
  return <C extends new (...args: ResolvedAll<D>) => ToolHandler<In, Out>>(value: C): C => {
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

/** An MCP server the workflow connects to (listed in `@Workflow({ mcp })`). */
export function McpServer(options: { readonly name: string } & McpServerConfig) {
  return <C extends Class>(value: C): C => {
    const { name, ...config } = options;
    recordComponent(value, { kind: "mcp-server", meta: { name, config } });
    return value;
  };
}

/** A typed facade of one tool of an `@McpServer`; agents reference it like any tool. */
export function McpTool(options: {
  readonly server: Class;
  readonly tool: string;
  readonly description: string;
  readonly effect?: ToolEffect;
  readonly timeoutMs?: number;
  readonly input: z.ZodType<Record<string, unknown>>;
  readonly output: z.ZodType;
}) {
  return <C extends Class>(value: C): C => {
    recordComponent(value, { kind: "mcp-tool", meta: options });
    return value;
  };
}

/**
 * A knowledge base: a class implementing `RagConnector`. `k` (passages per retrieval) is required —
 * there is no default. Agents bind it with a required `mode`: `rag: [{ use: CompanyDocs, mode: "tool" }]`.
 */
export function Rag<const D extends readonly Token[] = []>(options: {
  readonly name: string;
  readonly description: string;
  readonly k: number;
  readonly deps?: D;
}) {
  return <C extends new (...args: ResolvedAll<D>) => RagConnector>(value: C): C => {
    recordComponent(value, { kind: "rag", meta: { ...options, deps: options.deps ?? [] } });
    return value;
  };
}

/** An agent: its settings, its tools (class references) and its prompt file. */
export function Agent(options: AgentMeta) {
  return <C extends Class>(value: C): C => {
    recordComponent(value, { kind: "agent", meta: options });
    return value;
  };
}

/** The module of a set of agents (Angular `@NgModule`-like). Assemble with `workflowOf`. */
export function Workflow(options: WorkflowMeta) {
  return <C extends Class>(value: C): C => {
    recordComponent(value, { kind: "workflow", meta: options });
    return value;
  };
}
