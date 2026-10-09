import { z } from "zod";
import { defineTool } from "../define-tool.js";
import { McpUnavailableError } from "./errors.js";
const CallResultSchema = z.object({
  isError: z.boolean().optional(),
  structuredContent: z.unknown().optional(),
  content: z.array(z.looseObject({ type: z.string(), text: z.string().optional() })).default([]),
});
const textOf = (content) => content.map((part) => part.text ?? "").join("");
/** An output of one field `text` (e.g. `PlainText`): the server's text as is. */
const isTextOutput = (output) =>
  output instanceof z.ZodObject && Object.keys(output.shape).join() === "text";
/**
 * Maps an MCP call result to the facade's output value; errors become thrown messages. Structured
 * content wins; text goes as is to a string or a `{ text }` output, otherwise it is parsed as JSON.
 */
export function mcpResultValue(raw, output) {
  const result = CallResultSchema.parse(raw);
  const text = textOf(result.content);
  if (result.isError === true) throw new Error(text || "MCP tool reported an error");
  if (result.structuredContent !== undefined) return result.structuredContent;
  if (output instanceof z.ZodString) return text;
  if (isTextOutput(output)) return { text };
  const value = JSON.parse(text);
  return value;
}
/** Declares an MCP server by name. Its config lives in `mcpServers` of the agents config. */
export function mcpServer(name) {
  let caller;
  return {
    name,
    bind: (next) => {
      caller = next;
    },
    tool: (definition) => {
      const facade = defineTool({
        name: `${name}__${definition.tool}`,
        description: definition.description,
        input: definition.input,
        output: definition.output,
        timeoutMs: definition.timeoutMs,
        run: async (input, ctx) => {
          if (caller === undefined)
            throw new McpUnavailableError(`MCP server "${name}" is not connected`);
          const raw = await caller(definition.tool, input, ctx.signal);
          return definition.output.parse(mcpResultValue(raw, definition.output));
        },
      });
      return { ...facade, mcp: { server: name, tool: definition.tool } };
    },
  };
}
export const isMcpFacade = (tool) => "mcp" in tool;
