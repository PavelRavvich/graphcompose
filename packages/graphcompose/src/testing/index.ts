/**
 * `graphcompose/testing` — test a workflow without models and without the network: `testWith`
 * (Vitest fixtures `app`, `modelOf`, `mockOf`, `mcpOf`, `openApp`), scripted model turns
 * (`answer`, `callTool`, `decide`, `failWith`) and the matchers (register them with
 * `setupFiles: ["graphcompose/testing/setup"]`). Vitest is an optional peer dependency.
 * Wiki → Testing.
 */
import "../polyfills/symbol-metadata.js";
import "./vitest-types.js";

export { testWith, type WorkflowFixtures } from "./test-with.js";
export type { TestWithOptions } from "./environment.js";
export type { TestApp } from "./test-app.js";
export type { AgentSlice, RouterSlice, ToolSlice, ToolClassOf } from "./slices.js";
export {
  answer,
  callTool,
  decide,
  failWith,
  ModelCallFailedError,
  ModelFailure,
  type AnswerDetails,
  type DecisionDetails,
  type ScriptedTurn,
  type ToolClass,
} from "./script.js";
export type { ChatLine, ModelRequest, ModelScript } from "./script-book.js";
export type { McpStub, McpStubCall } from "./mcp-stubs.js";
export type { Duration, TestClock } from "./clock.js";
export {
  LiveCallBlockedError,
  TestFailure,
  TestSetupError,
  type TestFailureCode,
} from "./errors.js";
export {
  workflowMatchers,
  type ExpectedFailure,
  type ExpectedRequest,
  type WorkflowMatchers,
} from "./matchers.js";
export { UNSCRIPTED_SUMMARY } from "./scripted-gateway.js";
