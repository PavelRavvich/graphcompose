import { tool as langChainTool, type StructuredToolInterface } from "@langchain/core/tools";
import { z } from "zod";
import type { AnyTool, ToolContext, ToolResult } from "./types.js";

/** What the model reads back: JSON of the value, or a readable error. */
export function renderToolResult(result: ToolResult<unknown>): string {
  if (result.kind === "error") return `Tool error: ${result.message}`;
  return typeof result.value === "string" ? result.value : JSON.stringify(result.value);
}

/**
 * Exposes a tool to LangChain agents. The model sees the JSON Schema of the input; validation,
 * timeouts and error mapping stay in `tool.invoke`.
 */
export function toLangChainTool(tool: AnyTool, ctx: ToolContext): StructuredToolInterface {
  return langChainTool(async (input: unknown) => renderToolResult(await tool.invoke(input, ctx)), {
    name: tool.name,
    description: tool.description,
    schema: z.toJSONSchema(tool.input, { io: "input" }),
  });
}
