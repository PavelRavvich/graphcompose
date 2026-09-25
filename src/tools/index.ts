/**
 * Public API of the tools module. Everything outside src/tools imports from here only
 * (lint-enforced); tools never import graph, agents, prompts or routers.
 */
export {
  DEFAULT_TOOL_TIMEOUT_MS,
  defineTool,
  InvalidToolNameError,
  ToolTimeoutError,
  type ToolDefinition,
} from "./define-tool.js";

export { CurrentTime } from "./examples/current-time.js";
export { renderToolResult, toLangChainTool } from "./langchain.js";
export type { AnyTool, Tool, ToolContext, ToolEffect, ToolResult } from "./types.js";
export { schemaDifferences } from "./mcp/compat.js";
export {
  connectMcpServers,
  defaultTransport,
  type Env,
  type McpConnections,
  type TransportFactory,
} from "./mcp/connect.js";
export { McpContractError, McpUnavailableError } from "./mcp/errors.js";
export {
  isMcpFacade,
  mcpResultValue,
  mcpServer,
  type McpCaller,
  type McpFacade,
  type McpFacadeDefinition,
  type McpServerHandle,
  type McpToolRef,
} from "./mcp/facade.js";
