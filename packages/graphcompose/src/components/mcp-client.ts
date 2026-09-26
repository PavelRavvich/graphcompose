import type { z } from "zod";
import type { ToolContext, ToolResult } from "../tools/index.js";

/** A server tool as a workflow uses it: the schemas of its arguments and its result. */
export interface ServerTool {
  readonly input: z.ZodType<Record<string, unknown>>;
  readonly output: z.ZodType;
}
export type ServerTools = Readonly<Record<string, ServerTool>>;

/** What `call` goes through: the framework's facade of one server tool (validation, connection). */
export interface ServerToolCallable {
  invoke(raw: unknown, ctx: ToolContext): Promise<ToolResult<unknown>>;
}

const noCost = (): void => undefined;

/**
 * Standard implementation of an MCP server's client: `extends McpServerClient<Tools>` gives the class a
 * typed `call` — the tool name and its arguments are checked by the compiler, validated and parsed by
 * the declared schemas. The framework creates the instance and connects it; inject it like any dependency.
 */
export abstract class McpServerClient<TTools extends ServerTools> {
  /** Type only (not emitted): the declared tools, so `ToolsOf<Server>` can read them. */
  declare readonly declaredTools?: TTools;

  #tools: ReadonlyMap<string, ServerToolCallable> = new Map();

  /** Framework wiring: the connected tools of this server. */
  attachServerTools(tools: ReadonlyMap<string, ServerToolCallable>): void {
    this.#tools = tools;
  }

  async call<K extends keyof TTools & string>(
    name: K,
    args: z.input<TTools[K]["input"]>,
    signal: AbortSignal = new AbortController().signal,
  ): Promise<z.output<TTools[K]["output"]>> {
    const tool = this.#tools.get(name);
    if (tool === undefined) throw new Error(`MCP tool "${name}" is not declared on this server`);
    const result = await tool.invoke(args, {
      runId: "",
      workflow: "",
      agent: "",
      signal,
      reportCost: noCost,
    });
    if (result.kind === "error") throw new Error(result.message);
    return result.value as z.output<TTools[K]["output"]>;
  }
}

type Handlers<TTools extends ServerTools> = {
  readonly [K in keyof TTools]?: (
    args: z.output<TTools[K]["input"]>,
  ) => Promise<z.input<TTools[K]["output"]>>;
};

/** The tools a server class declares (`extends McpServerClient<Tools>`). */
export type ToolsOf<TServer> = TServer extends { readonly declaredTools?: infer TTools }
  ? NonNullable<TTools>
  : never;

/** A server instance answered by `handlers` — for testing MCP tools with `new`, no process. */
export function mcpServerStub<TServer extends McpServerClient<ServerTools>>(
  server: new () => TServer,
  handlers: Handlers<ToolsOf<TServer>>,
): TServer {
  const instance = new server();
  const entries = Object.entries(handlers).flatMap(([name, handler]) => {
    if (handler === undefined) return [];
    // one handler per declared tool; at this boundary its argument and result are plain data
    const call = handler as (args: unknown) => Promise<unknown>;
    const callable: ServerToolCallable = {
      invoke: async (raw) => ({ kind: "ok", value: await call(raw) }),
    };
    return [[name, callable] as const];
  });
  instance.attachServerTools(new Map(entries));
  return instance;
}
