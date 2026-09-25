import type { AgentPrompts, AgentsConfigOf } from "./config/types.js";
import type { KnowledgeSource, RagConnector } from "./rag/types.js";
import type { AnyTool, McpServerHandle } from "./tools/index.js";
import type { Router } from "./routers/index.js";

/** What the core offers the tools of a workflow. */
export interface WorkflowServices {
  /** A router on the workflow's default router model (Jev) — cheap decisions inside tools. */
  readonly router: (name: string) => Router;
  /** The process environment (tools reading settings); default process.env. */
  readonly env?: NodeJS.ProcessEnv;
}

/** Tools as a list, or a factory when they need core services. */
export type WorkflowTools =
  readonly AnyTool[] | ((services: WorkflowServices) => readonly AnyTool[]);

/**
 * Everything one set of agents needs: config, prompts, the tools it may use, the MCP servers behind
 * its facades and, optionally, which tools wait for a human (pause seam).
 */
export interface AssembledWorkflow<TName extends string = string> {
  readonly config: AgentsConfigOf<TName>;
  readonly prompts: AgentPrompts<TName>;
  readonly tools: WorkflowTools;
  readonly mcpServers: readonly McpServerHandle<string>[];
  /** Context-mode knowledge bases per agent (retrieved before the agent runs). */
  readonly knowledge?: (
    services: WorkflowServices,
  ) => ReadonlyMap<string, readonly KnowledgeSource[]>;
  /** Every knowledge base of the workflow (for `npm run rag:index`). */
  readonly knowledgeBases?: (
    services: WorkflowServices,
  ) => readonly { readonly name: string; readonly connector: RagConnector }[];
  /** Per tool: its constructor dependencies as a tree, e.g. `JobFitJudge (ROUTER_FACTORY), JOB_SEARCH`. */
  readonly toolDependencies?: Readonly<Record<string, string>>;
  /** Compaction prompt override (workflows with `compaction`). */
  readonly compactionPrompt?: string;
  /** Set to turn the pause seam on; the app supplies an in-process checkpointer. */
  readonly needsApproval?: (tool: AnyTool) => boolean;
}

export const resolveTools = (
  bundle: AssembledWorkflow,
  services: WorkflowServices,
): readonly AnyTool[] =>
  typeof bundle.tools === "function" ? bundle.tools(services) : bundle.tools;
