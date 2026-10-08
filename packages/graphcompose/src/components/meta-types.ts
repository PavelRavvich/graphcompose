import type { AgentsConfig } from "../config/types.js";
import type { AnyTool } from "../tools/index.js";
import type { RagMode } from "../rag/types.js";
import type { Flow } from "../graph/flow.js";
import type { Class, Provider } from "./injection.js";

import type { PromptOptions } from "./prompt-options.js";

type AgentSettings = AgentsConfig["agents"][string];

/** An agent's use of a `@Rag` knowledge base; both fields required (no defaults). */
export interface RagBinding {
  readonly use: Class;
  readonly mode: RagMode;
}

/** `@Agent` — settings of one agent; tools are class references. */
export interface AgentMeta {
  readonly name: string;
  /** The compensating agent class for SAGA rollbacks */
  readonly compensate?: Class;
  readonly description: string;
  readonly prompt?: string;
  readonly promptUrls?: readonly string[];
  readonly model: string;
  /** Overrides the global memory strategy for this specific agent. */
  readonly memoryStrategy?: Class;
  /** Overrides the model provider's price table; the provider's own reported cost comes first. */
  readonly price?: AgentSettings["price"];
  readonly thinking?: AgentSettings["thinking"];
  readonly temperature?: number;
  readonly maxTokens?: AgentSettings["maxTokens"];
  /** `{{key}}` in agent prompts is replaced with the value (assembly fails on unknown keys). */
  readonly promptVariables?: Readonly<Record<string, string>>;
  readonly cache?: boolean;
  readonly historyLimit?: number;
  readonly historySummaries?: number;
  /** Tool calls per call of the agent (`agents.<name>.limits.toolCalls`); default 20. */
  readonly maxToolCalls?: number;
  /** `@Tool` or `@McpTool` classes. */
  readonly tools?: readonly Class[];
  readonly piiPolicies?: readonly Class[];
  readonly guardrails?: readonly Class[];
  readonly overridePiiPolicies?: readonly Class[];
  readonly disablePiiPolicies?: readonly Class[];
  readonly overrideGuardrails?: readonly Class[];
  readonly disableGuardrails?: readonly Class[];
  /** Knowledge bases: `{ use: CompanyDocs, mode: "tool" | "context" }` — `mode` is required. */
  readonly rag?: readonly RagBinding[];
  /** Set by `@Agent` itself: the file the agent is declared in. */
  readonly source?: string;
}

/**
 * `@Workflow` — the module: its graph (`flow`; the agents are the flow's agent nodes), workflow
 * settings, MCP servers and providers for DI. Limits come from the class's `settings()`.
 */

/** `@WorkflowAction` — a programmatic node without LLM. */
export interface WorkflowActionMeta {
  readonly name: string;
  readonly compensate?: Class;
  readonly description?: string;
  readonly inboundAdapter?: Class;
}

export interface WorkflowMeta {
  readonly name: string;
  readonly version: string;
  /** The workflow's graph: transitions between its nodes (Wiki → Workflow). */
  readonly flow: Flow;
  readonly defaults: AgentsConfig["defaults"];
  readonly guards?: AgentsConfig["guards"];
  readonly piiPolicies?: readonly Class[];
  readonly guardrails?: readonly Class[];
  /** Deprecated: use memoryStorage and defaultMemoryStrategy instead */
  readonly compaction?: AgentsConfig["compaction"];
  /** The DI class used to store memory/context (e.g. GraphStateMemoryStorage) */
  readonly memoryStorage?: Class;
  /** The default memory strategy (e.g. StandardCompactionStrategy) */
  readonly defaultMemoryStrategy?: Class;
  readonly mcp?: readonly Class[];
  readonly providers?: readonly Provider[];
  readonly compactionPrompt?: string;
  readonly promptVariables?: Readonly<Record<string, string>>;
  readonly channelClasses?: readonly Class[];
}

/** `@Channel` — settings of a channel. */
export interface ChannelMeta {
  readonly name: string;
  readonly description?: string;
  readonly inboundAdapter?: Class;
}
