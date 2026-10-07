import type { ObserverManager } from "../core/observer-manager.js";
import type { AgentPrompts, AgentsConfigOf } from "../config/types.js";
import type { GuardSet } from "../guards/index.js";
import type { ModelRegistry } from "../llm/registry.js";
import type { PauseSeam } from "../pause/index.js";
import type { KnowledgeSource } from "../rag/types.js";
import type { Router } from "../routers/index.js";
import type { AnyTool } from "../tools/index.js";
import type { Flow } from "./flow.js";
import type { LoadedRouter } from "./router-texts.js";
import type { IWorkflowAction, ChannelRequest } from "../components/decorators.js";
import type { WorkflowLimits } from "./settings.js";

/** What the workflow's graph is built from: its flow, its agents and the existing nodes' parts. */
export interface GraphDeps<TName extends string> {
  readonly config: AgentsConfigOf<TName>;
  readonly registry: ModelRegistry;
  readonly prompts: AgentPrompts<TName>;
  /** Resolves a tool name from an agent's config to the tool. */
  readonly tools: (name: string) => AnyTool;
  readonly guards: GuardSet;
  /** Resolves an action name to the instantiated WorkflowAction */
  readonly actions?: (name: string) => IWorkflowAction;
  /** Context-mode knowledge bases per agent (knowledge bases, #88). */
  readonly knowledge?: (agent: string) => readonly KnowledgeSource[];
  /** Optional pause seam (approval of tool calls). Off by default. */
  readonly pause?: PauseSeam | undefined;
  /** Dispatches an approval request to the specified channel. */
  readonly requestApproval?: (channelName: string, req: ChannelRequest) => Promise<void>;
  readonly piiPolicies?: (agent: string) => { override: boolean; instances: readonly any[]; disable: readonly any[] };
  readonly toolPiiPolicies?: (tool: string) => { override: boolean; instances: readonly any[]; disable: readonly any[] };
  readonly toolGuardrails?: (tool: string) => { override: boolean; instances: readonly any[]; disable: readonly any[] };
  readonly workflowPiiPolicies?: readonly any[];
  readonly workflowGuardrails?: readonly any[];
  readonly guardrails?: (agent: string) => { override: boolean; instances: readonly any[]; disable: readonly any[] };
  readonly channelAdapters?: (channel: string) => any;
  /** The workflow's graph: its transitions (`@Workflow({ flow })`). */
  readonly flow: Flow;
  /** From the workflow's `settings()`. */
  readonly limits: WorkflowLimits;
  /** Every router of the flow with its texts loaded (part of the run's versions). */
  readonly routers: readonly LoadedRouter[];
  /** The routing strategy of a router: its own model (Jev or a chat model). */
  readonly routerFor: (router: LoadedRouter) => Router;
  readonly observer?: ObserverManager;
}
