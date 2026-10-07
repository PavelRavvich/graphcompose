import type { AgentPrompts, AgentsConfigOf } from "./config/types.js";
import type { KnowledgeSource, RagConnector } from "./rag/types.js";
import type { IWorkflowAction } from "./components/decorators.js";
import type { AnyTool, McpFacade, McpServerHandle } from "./tools/index.js";
import type { Router } from "./routers/index.js";
import type { Flow } from "./graph/flow.js";
import type { LoadedRouter } from "./graph/router-texts.js";
import type { ModelProviderSettings, WorkflowLimits } from "./graph/settings.js";
import type { ContainerOptions } from "./components/container.js";

/** What the core offers the tools of a workflow. */
export interface WorkflowServices {
  /** A router on the workflow's default router model (Jev) — cheap decisions inside tools. */
  readonly router: (name: string) => Router;
  /** The process environment (tools reading settings); default process.env. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly env?: any;
  /** Framework wiring of the app's container: replacements (test mocks) and lifecycle. */
  readonly container?: ContainerOptions;
}

/** Tools as a list, or a factory when they need core services. */
export type WorkflowTools =
  readonly AnyTool[] | ((services: WorkflowServices) => readonly AnyTool[]);

/**
 * Everything one workflow needs: its flow, limits and routers, config, prompts, the tools it may
 * use, the MCP servers behind its facades and, optionally, which tools wait for an approval (pause seam).
 */
export interface AssembledWorkflow<TName extends string = string> {
  readonly config: AgentsConfigOf<TName>;
  /** The workflow's graph (checked at assembly). */
  readonly flow: Flow;
  /** From the workflow's `settings()`. */
  readonly limits: WorkflowLimits;
  /** From the workflow's `settings()`; absent = OpenRouter and Jev. */
  readonly models?: ModelProviderSettings;
  /** Every router of the flow with its texts loaded. */
  readonly routers: readonly LoadedRouter[];
  readonly prompts: AgentPrompts<TName>;
  readonly tools: WorkflowTools;
  readonly mcpServers: readonly McpServerHandle<string>[];
  /** Every declared server tool, checked against its server at startup (`@McpServer({ tools })`). */
  readonly serverTools?: readonly McpFacade[];
  /** Action instances instantiated from DI container */
  readonly actions?: (services: WorkflowServices) => ReadonlyMap<string, IWorkflowAction>;
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
  readonly channels?: (services: WorkflowServices) => ReadonlyMap<string, any>;
  readonly piiPolicies?: (
    services: WorkflowServices,
  ) => ReadonlyMap<
    string,
    { override: boolean; instances: readonly any[]; disable: readonly any[] }
  >;
  readonly guardrails?: (
    services: WorkflowServices,
  ) => ReadonlyMap<
    string,
    { override: boolean; instances: readonly any[]; disable: readonly any[] }
  >;
  readonly toolPiiPolicies?: (
    services: WorkflowServices,
  ) => ReadonlyMap<
    string,
    { override: boolean; instances: readonly any[]; disable: readonly any[] }
  >;
  readonly toolGuardrails?: (
    services: WorkflowServices,
  ) => ReadonlyMap<
    string,
    { override: boolean; instances: readonly any[]; disable: readonly any[] }
  >;
  readonly workflowPiiPolicies?: (services: WorkflowServices) => readonly any[];
  readonly workflowGuardrails?: (services: WorkflowServices) => readonly any[];
  readonly channelAdapters?: (services: WorkflowServices) => ReadonlyMap<string, any>;
}

export const resolveTools = (
  bundle: AssembledWorkflow,
  services: WorkflowServices,
): readonly AnyTool[] =>
  typeof bundle.tools === "function" ? bundle.tools(services) : bundle.tools;
