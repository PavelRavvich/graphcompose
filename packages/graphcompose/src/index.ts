/**
 * GraphCompose — typed agent workflows on LangGraph. Public API: components (decorators, DI),
 * running and resuming, knowledge bases, tools, configuration types. Wiki → Components.
 */
import "./polyfills/symbol-metadata.js";

export {
  resolveTools,
  type AssembledWorkflow,
  type WorkflowServices,
  type WorkflowTools,
} from "./workflow.js";
export {
  createAppDeps,
  type AppDeps,
  type AppDepsOptions,
  type AppStores,
  type McpConnect,
} from "./app/app-deps.js";
export { createApp, NotAWorkflowStartError, type AppOptions } from "./app/create-app.js";
export type { PausedRun, PausedRunRepository } from "./app/paused-runs.js";
export {
  createSqlitePausedRunRepository,
  type SqlitePausedRunRepository,
} from "./app/sqlite-paused-runs.js";
export {
  IncompatibleResumeError,
  type IncompatibleResume,
  type IncompatibleResumePolicy,
  type ResumeDecision,
  type ResumeVersions,
} from "./run/resume-guard.js";
export type {
  App,
  CancelOptions,
  CancelOutput,
  ExecutionOptions,
  ExecutionOutput,
} from "./app/types.js";
export type { RunContext, RunId } from "./core/run-context.js";
export { loadWorkflow, loadWorkflowClass, WorkflowLoadError } from "./cli/load-workflow.js";
export { withProfile } from "./profile-workflow.js";
export {
  compareProfiles,
  type CompareProfilesOptions,
  type ProfileComparison,
} from "./eval/compare-profiles.js";
export type { ProfileReport } from "./eval/compare-report.js";
export type { PairwiseResult } from "./eval/compare.js";
export { describeWorkflow } from "./cli/describe.js";
export type { GraphDeps } from "./graph/deps.js";
export { resumeAgent } from "./run/resume-agent.js";
export { runAgent } from "./run/run-agent.js";
export type { McpServerOptions } from "./mcp/mcp-server.decorator.js";
export { McpServer } from "./mcp/mcp-server.decorator.js";
export type { McpSession } from "./mcp/mcp-service.js";
export { McpService, createMcpService } from "./mcp/mcp-service.js";
export type {
  AgentExecutionOutput,
  RunDeps,
  RunOptions,
  RunStatus,
  SpendAccount,
} from "./run/types.js";
export { runVersions } from "./run/versions.js";
export type { UsageRecord } from "./finops/usage.js";
export {
  MODEL_MAX,
  type AgentsConfig,
  type AgentsConfigOf,
  type CompactionSettings,
} from "./config/types.js";
export {
  Channel,
  type ActionContext,
  type ActionRuntime,
  type ChannelHandler,
  type ChannelRequest,
  type ChannelDecision,
} from "./components/decorators.js";
export {
  Judge,
  type JudgeContext,
  type JudgeHandler,
  type JudgeMeta,
  type JudgeModel,
  type JudgeVerdict,
} from "./components/judge-decorators.js";
export {
  Decision,
  MAX_DECISION_QUESTIONS,
  type AnswerOf,
  type AnswersOf,
  type ChoiceAnswer,
  type ChoiceQuestion,
  type DecisionAnswer,
  type DecisionImage,
  type DecisionQuestion,
  type DecisionQuestions,
  type DecisionRequest,
  type DecisionState,
  type ImageDetail,
  type NoulAnswer,
  type NoulQuestion,
  type ScoreAnswer,
  type ScoreQuestion,
} from "./llm/decisions.js";
export { TerminalUserChannel } from "./channels/terminal-channel.js";
export { ENV } from "./components/runtime.js";
export { Injectable } from "./components/decorators.js";
// the authoring decorators `gc generate` writes, from the root entry (#197; MCP and RAG: their own entries)
export { Agent, Tool, Workflow, type ToolHandler } from "./components/decorators.js";
export type { ToolContext } from "./tools/index.js";
export {
  defineEnvironment,
  fromEnv,
  EnvironmentError,
  type Environment,
  type EnvironmentDefinition,
  type EnvironmentValues,
  type FromEnv,
  type FromEnvOptions,
} from "./environments/index.js";
export * from "./errors.js";
