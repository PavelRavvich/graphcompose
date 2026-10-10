import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Class } from "../components/injection.js";
import { componentOf } from "../components/metadata.js";
import { jsonSchemaOf } from "../dto/schema.js";
import type { DtoClass } from "../dto/types.js";
import type { McpServerOptions } from "./mcp-server.decorator.js";

/** Helpers for `McpService`: reading `@McpServer` options, tool schemas and the resume tool. */

/**
 * What this service currently calls on a resolved `@Tool` component.
 * BUG(#191): tool components implement `ToolHandler.run(input, ctx)`, not `execute`.
 */
export interface LegacyExecutableTool {
  execute(input: unknown, context: unknown): Promise<unknown>;
}

/** The part of the SDK's SSE server transport that `McpService` uses. */
export interface SseTransport extends Transport {
  readonly sessionId: string;
  handlePostMessage(req: IncomingMessage, res: ServerResponse, parsedBody?: unknown): Promise<void>;
}

export const createSseTransport = (endpoint: string, res: ServerResponse): SseTransport =>
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- SSE kept as the HTTP transport; migrating to StreamableHTTPServerTransport changes the wire protocol (out of scope for #180)
  new SSEServerTransport(endpoint, res);

export type ToolHandler = (args: unknown) => Promise<unknown>;

export interface ToolRegistry {
  readonly tools: Tool[];
  readonly handlers: Map<string, ToolHandler>;
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** The `@McpServer` options recorded on `config` (the decorator records a kind outside `ComponentMeta`). */
export function mcpServerOptionsOf(config: Class): McpServerOptions | undefined {
  const component: unknown = componentOf(config);
  if (!isRecord(component) || component.kind !== "mcp-server-config") return undefined;
  const meta = component.meta;
  if (
    !isRecord(meta) ||
    typeof meta.name !== "string" ||
    typeof meta.version !== "string" ||
    !Array.isArray(meta.exports)
  ) {
    return undefined;
  }
  return { name: meta.name, version: meta.version, exports: meta.exports as readonly Class[] };
}

export const toolInputSchema = (dto: DtoClass): Tool["inputSchema"] => ({
  ...jsonSchemaOf(dto),
  type: "object",
});

export const RESUME_TOOL: Tool = {
  name: "resume_workflow",
  description: "Resume a paused workflow by providing the thread ID and decision data.",
  inputSchema: {
    type: "object",
    properties: {
      threadId: { type: "string", description: "The ID of the paused thread." },
      decision: {
        type: "string",
        description: "The decision/data as a JSON string to pass back to the workflow.",
      },
    },
    required: ["threadId", "decision"],
  },
};

export function parseDecision(decision: unknown): unknown {
  if (typeof decision !== "string") return decision;
  try {
    return JSON.parse(decision) as unknown;
  } catch {
    return decision; // not JSON: pass as string
  }
}

export const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

export const isLegacyExecutableTool = (value: unknown): value is LegacyExecutableTool =>
  isRecord(value) && typeof value.execute === "function";
