/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-deprecated, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-confusing-void-expression, max-lines-per-function, complexity, @typescript-eslint/prefer-nullish-coalescing */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { App, ExecutionOutput } from "../app/types.js";
import type { Class } from "../components/injection.js";
import { componentOf } from "../components/metadata.js";
import { nodeInfoOf } from "../graph/node-kind.js";
import { workflowStartMetaOf } from "../graph/workflow-start.decorator.js";
import { jsonSchemaOf, validate } from "../dto/schema.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolHandler = (args: any, context?: unknown) => Promise<unknown>;

export interface McpSession {
  readonly sessionId: string;
  close(): Promise<void>;
}

export class McpService {
  private readonly options: any;
  private readonly activeTransports = new Map<
    string,
    { transport: SSEServerTransport; context: unknown }
  >();

  constructor(
    private readonly app: App,
    config: Class,
  ) {
    const component = componentOf(config) as any;
    if (component?.kind !== "mcp-server-config") {
      throw new Error(`${config.name} is not an @McpServer`);
    }
    this.options = component.meta;
  }

  private createServerInstance(context: unknown): Server {
    const server = new Server(
      { name: this.options.name, version: this.options.version },
      { capabilities: { tools: {} } },
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: any[] = [];
    let hasWorkflows = false;
    const handlers = new Map<string, ToolHandler>();

    for (const exp of this.options.exports || []) {
      const cmp = componentOf(exp);
      const node = nodeInfoOf(exp);

      if (cmp?.kind === "tool") {
        tools.push({
          name: cmp.meta.name,
          description: cmp.meta.description || cmp.meta.prompt || "",
          inputSchema: jsonSchemaOf(cmp.meta.input),
        });

        handlers.set(cmp.meta.name, async (args: unknown) => {
          const validated = validate(cmp.meta.input, args);
          const toolInstance = this.app.resolve(exp) as any;
          return await toolInstance.execute(validated, context);
        });
      } else if (node?.kind === "workflow-start") {
        hasWorkflows = true;
        const startMeta = workflowStartMetaOf(exp);
        if (!startMeta) continue;

        tools.push({
          name: startMeta.name,
          description: startMeta.description || `Run workflow starting at ${startMeta.name}`,
          inputSchema: jsonSchemaOf(startMeta.input),
        });

        handlers.set(startMeta.name, async (args: unknown) => {
          const validated = validate(startMeta.input, args);
          const result = await this.app.execute(exp, validated as any, {
            executionContext: context,
          });
          return this.formatWorkflowOutput(result);
        });
      }
    }

    if (hasWorkflows) {
      tools.push({
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
      });

      handlers.set("resume_workflow", async (args: any) => {
        let decisionData: unknown = args.decision;
        try {
          if (typeof args.decision === "string") {
            decisionData = JSON.parse(args.decision);
          }
        } catch {
          // ignore, pass as string
        }
        const result = await this.app.resume(args.threadId, decisionData, {
          executionContext: context,
        });
        return this.formatWorkflowOutput(result);
      });
    }

    server.setRequestHandler("tools/list" as any, async () => ({
      tools,
    }));

    server.setRequestHandler("tools/call" as any, async (request: any) => {
      const handler = handlers.get(request.params.name);
      if (!handler) {
        throw new Error(`Tool not found: ${request.params.name}`);
      }
      try {
        const result = await handler(request.params.arguments);
        return {
          content: [
            { type: "text", text: typeof result === "string" ? result : JSON.stringify(result) },
          ],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    });

    return server;
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
    const transport = new SSEServerTransport(messageEndpoint, res);
    await server.connect(transport);

    this.activeTransports.set(transport.sessionId, { transport, context });

    res.on("close", () => {
      this.activeTransports.delete(transport.sessionId);
    });

    return {
      sessionId: transport.sessionId,
      close: async () => await transport.close(),
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
    await session.transport.handlePostMessage(req as any, res, parsedBody);
  }
}

export function createMcpService(app: App, config: Class): McpService {
  return new McpService(app, config);
}
