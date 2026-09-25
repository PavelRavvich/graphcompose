import type { AgentsConfig, ReasoningSettings } from "../config/types.js";
import type { AnyTool } from "../tools/index.js";
import type { Class, Provider } from "./injection.js";

type AgentSettings = AgentsConfig["agents"][string];

/** `@Agent` — settings of one agent; tools are class references; the prompt is a file next to it. */
export interface AgentMeta {
  readonly name: string;
  readonly description: string;
  readonly model: string;
  readonly price: AgentSettings["price"];
  readonly thinking?: AgentSettings["thinking"];
  readonly temperature?: number;
  readonly maxTokens?: AgentSettings["maxTokens"];
  readonly cache?: boolean;
  readonly historyLimit?: number;
  readonly historySummaries?: number;
  readonly maxToolCalls?: number;
  readonly reasoning?: ReasoningSettings;
  /** `@Tool` or `@McpTool` classes. */
  readonly tools?: readonly Class[];
  /** `new URL("./name.prompt.md", import.meta.url)` */
  readonly prompt: URL;
}

/** `@Bundle` — the module: bundle settings, its agents and MCP servers, and providers for DI. */
export interface BundleMeta {
  readonly name: string;
  readonly version: string;
  readonly defaults: AgentsConfig["defaults"];
  readonly budget: AgentsConfig["budget"];
  readonly routers: AgentsConfig["routers"];
  readonly guards?: AgentsConfig["guards"];
  readonly compaction?: AgentsConfig["compaction"];
  readonly agents: readonly Class[];
  readonly mcp?: readonly Class[];
  readonly providers?: readonly Provider[];
  /** `{{key}}` in agent prompts is replaced with the value (assembly fails on unknown keys). */
  readonly promptVariables?: Readonly<Record<string, string>>;
  readonly compactionPrompt?: string;
  /** Turns the pause seam on for tools it returns true for. */
  readonly needsApproval?: (tool: AnyTool) => boolean;
}
