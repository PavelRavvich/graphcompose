import type { AgentsConfig } from "../config/types.js";
import type { AnyTool } from "../tools/index.js";
import type { RagMode } from "../rag/types.js";
import type { Flow } from "../graph/flow.js";
import type { Class, Provider } from "./injection.js";

import type { PromptInput } from "./prompt-input.js";

type AgentSettings = AgentsConfig["agents"][string];

/** An agent's use of a `@Rag` knowledge base; both fields required (no defaults). */
export interface RagBinding {
  readonly use: Class;
  readonly mode: RagMode;
}

/** `@Agent` — settings of one agent; tools are class references. */
export interface AgentMeta {
  readonly name: string;
  readonly description: string;
  readonly instructions: PromptInput;
  readonly model: string;
  /** Overrides the model provider's price table; the provider's own reported cost comes first. */
  readonly price?: AgentSettings["price"];
  readonly thinking?: AgentSettings["thinking"];
  readonly temperature?: number;
  readonly maxTokens?: AgentSettings["maxTokens"];
  readonly cache?: boolean;
  readonly historyLimit?: number;
  readonly historySummaries?: number;
  /** Tool calls per call of the agent (`agents.<name>.limits.toolCalls`); default 20. */
  readonly maxToolCalls?: number;
  /** `@Tool` or `@McpTool` classes. */
  readonly tools?: readonly Class[];
  /** Knowledge bases: `{ use: CompanyDocs, mode: "tool" | "context" }` — `mode` is required. */
  readonly rag?: readonly RagBinding[];
  /** Set by `@Agent` itself: the file the agent is declared in. */
  readonly source?: string;
}

/**
 * `@Workflow` — the module: its graph (`flow`; the agents are the flow's agent nodes), workflow
 * settings, MCP servers and providers for DI. Limits come from the class's `settings()`.
 */
export interface WorkflowMeta {
  readonly name: string;
  readonly version: string;
  /** The workflow's graph: transitions between its nodes (Wiki → Workflow). */
  readonly flow: Flow;
  readonly defaults: AgentsConfig["defaults"];
  readonly guards?: AgentsConfig["guards"];
  readonly compaction?: AgentsConfig["compaction"];
  readonly mcp?: readonly Class[];
  readonly providers?: readonly Provider[];
  /** `{{key}}` in agent prompts is replaced with the value (assembly fails on unknown keys). */
  readonly promptVariables?: Readonly<Record<string, string>>;
  readonly compactionPrompt?: string;
  /** Turns the pause seam on for tools it returns true for. */
  readonly needsApproval?: (tool: AnyTool) => boolean;
}
