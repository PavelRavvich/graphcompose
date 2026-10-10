import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { App, ExecutionOutput } from "../app/types.js";
import type { Class } from "../components/injection.js";
import { componentOf, type ToolMeta } from "../components/metadata.js";
import { nodeInfoOf } from "../graph/node-kind.js";
import { workflowStartMetaOf } from "../graph/workflow-start.decorator.js";
import { validate } from "../dto/schema.js";
import type { McpServerOptions } from "./mcp-server.decorator.js";
import {
  RESUME_TOOL,
  createSseTransport,
  errorMessage,
  isLegacyExecutableTool,
  isRecord,
  mcpServerOptionsOf,
  parseDecision,
  toolInputSchema,
  type SseTransport,
  type ToolRegistry,
} from "./mcp-service-helpers.js";

export interface McpSession {
  readonly sessionId: string;
  close(): Promise<void>;
}

export class McpService {
  private readonly options: McpServerOptions;
  private readonly activeTransports = new Map<
    string,
    { transport: SseTransport; context: unknown }
  >();

  constructor(
    private readonly app: App,
    config: Class,
  ) {
    const options = mcpServerOptionsOf(config);
    if (!options) {
      throw new Error(`${config.name} is not an @McpServer`);
    }
    this.options = options;
  }

  private createServerInstance(context: unknown): McpServer {
    const mcp = new McpServer(
      { name: this.options.name, version: this.options.version },
      { capabilities: { tools: {} } },
    );
    const { tools, handlers } = this.collectTools(context);

    mcp.server.setRequestHandler(ListToolsRequestSchema, () => ({ tools }));

    mcp.server.setRequestHandler(
      CallToolRequestSchema,
      async (request): Promise<CallToolResult> => {
        const { name, arguments: args } = request.params;
        const handler = handlers.get(name);
        if (!handler) {
          throw new Error(`Tool not found: ${name}`);
        }
        try {
          const result = await handler(args);
          return {
            content: [
              { type: "text", text: typeof result === "string" ? result : JSON.stringify(result) },
            ],
          };
        } catch (err: unknown) {
          return {
            content: [{ type: "text", text: `Error: ${errorMessage(err)}` }],
            isError: true,
          };
        }
      },
    );

    return mcp;
  }

  private collectTools(context: unknown): ToolRegistry {
    const registry: ToolRegistry = { tools: [], handlers: new Map() };
    let hasWorkflows = false;

    for (const exp of this.options.exports) {
      const cmp = componentOf(exp);
      if (cmp?.kind === "tool") {
        this.addTool(registry, exp, cmp.meta, context);
      } else if (nodeInfoOf(exp)?.kind === "workflow-start") {
        hasWorkflows = true;
        this.addWorkflowStart(registry, exp, context);
      }
    }

    if (hasWorkflows) this.addResumeTool(registry, context);
    return registry;
  }

  private addTool(registry: ToolRegistry, exp: Class, meta: ToolMeta, context: unknown): void {
    registry.tools.push({
      name: meta.name,
      description: meta.description || (meta.prompt ?? ""),
      inputSchema: toolInputSchema(meta.input),
    });

    registry.handlers.set(meta.name, async (args) => {
      const validated = validate(meta.input, args);
      const toolInstance: unknown = this.app.resolve(exp);
      // BUG(#191): tool components implement `run(input, ctx)`; this still calls `execute`.
      if (!isLegacyExecutableTool(toolInstance)) {
        throw new TypeError("toolInstance.execute is not a function");
      }
      return await toolInstance.execute(validated, context);
    });
  }

  private addWorkflowStart(registry: ToolRegistry, exp: Class, context: unknown): void {
    const startMeta = workflowStartMetaOf(exp);
    if (!startMeta) return;

    registry.tools.push({
      name: startMeta.name,
      description: startMeta.description || `Run workflow starting at ${startMeta.name}`,
      inputSchema: toolInputSchema(startMeta.input),
    });

    registry.handlers.set(startMeta.name, async (args) => {
      const validated = validate(startMeta.input, args);
      const result = await this.app.execute(exp, validated, { executionContext: context });
      return this.formatWorkflowOutput(result);
    });
  }

  private addResumeTool(registry: ToolRegistry, context: unknown): void {
    registry.tools.push(RESUME_TOOL);
    registry.handlers.set(RESUME_TOOL.name, async (args) => {
      const input = isRecord(args) ? args : {};
      if (typeof input.threadId !== "string") {
        throw new Error("threadId must be a string");
      }
      const result = await this.app.resume(input.threadId, parseDecision(input.decision), {
        executionContext: context,
      });
      return this.formatWorkflowOutput(result);
    });
  }

  private formatWorkflowOutput(result: ExecutionOutput) {
    if (result.status === "paused") {
      return {
        status: "paused",
        threadId: result.thread,
        message: "Workflow paused, requires resume.",
        pauseDetails: result.pause,
      };
    }
    if (result.output) return result.output;
    if (result.finishes) return result.finishes;
    return result;
  }

  /**
   * Connects the MCP server over standard input/output (CLI usage).
   * Note: This blocks the process from exiting.
   */
  public async connectStdio(): Promise<void> {
    const server = this.createServerInstance(undefined);
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }

  /**
   * Starts an SSE session for an incoming HTTP GET request.
   * Note: You must provide a messageEndpoint (e.g. "/mcp/messages") where POSTs will be routed.
   */
  public async handleSse(
    res: ServerResponse,
    messageEndpoint: string,
    context?: unknown,
  ): Promise<McpSession> {
    const server = this.createServerInstance(context);
    const transport = createSseTransport(messageEndpoint, res);
    await server.connect(transport);

    this.activeTransports.set(transport.sessionId, { transport, context });

    res.on("close", () => {
      this.activeTransports.delete(transport.sessionId);
    });

    return {
      sessionId: transport.sessionId,
      close: async () => {
        await transport.close();
      },
    };
  }

  /**
   * Forwards a POSTed JSON-RPC message to the correct SSE session.
   */
  public async handleMessage(
    req: IncomingMessage,
    res: ServerResponse,
    sessionId: string,
    parsedBody?: unknown,
  ): Promise<void> {
    const session = this.activeTransports.get(sessionId);
    if (!session) {
      res.statusCode = 404;
      res.end("Session not found");
      return;
    }
    await session.transport.handlePostMessage(req, res, parsedBody);
  }
}

export function createMcpService(app: App, config: Class): McpService {
  return new McpService(app, config);
}
