/**
 * Public API of the tools module. Everything outside src/tools imports from here only
 * (lint-enforced); tools never import graph, agents, prompts or routers.
 */
export { toolRegistry, type ToolName } from "./catalog.js";
export {
  DEFAULT_TOOL_TIMEOUT_MS,
  defineTool,
  InvalidToolNameError,
  ToolTimeoutError,
  type ToolDefinition,
} from "./define-tool.js";
export { createCurrentTimeTool, type CurrentTimeTool } from "./examples/current-time.js";
export { renderToolResult, toLangChainTool } from "./langchain.js";
export {
  createToolRegistry,
  DuplicateToolError,
  UnknownToolError,
  type ToolNameOf,
  type ToolRegistry,
} from "./registry.js";
export type { AnyTool, Tool, ToolContext, ToolEffect, ToolResult } from "./types.js";
