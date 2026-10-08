const noCost = () => undefined;
/**
 * Standard implementation of an MCP server's client: `extends McpServerClient<Tools>` gives the class a
 * typed `call` — the tool name and its arguments are checked by the compiler, validated and parsed by
 * the declared DTOs. The framework creates the instance and connects it; inject it like any dependency.
 */
export class McpServerClient {
    #tools = new Map();
    /** Framework wiring: the connected tools of this server. */
    attachServerTools(tools) {
        this.#tools = tools;
    }
    async call(name, args, signal = new AbortController().signal) {
        const tool = this.#tools.get(name);
        if (tool === undefined)
            throw new Error(`MCP tool "${name}" is not declared on this server`);
        const result = await tool.invoke(args, {
            runId: "",
            workflow: "",
            agent: "",
            callId: "",
            signal,
            reportCost: noCost,
            pause: () => {
                throw new Error("MCP tools cannot pause locally");
            },
        });
        if (result.kind === "error")
            throw new Error(result.message);
        // the facade validated the value against the declared output DTO
        return result.value;
    }
}
/** A server instance answered by `handlers` — for testing MCP tools with `new`, no process. */
export function mcpServerStub(server, handlers) {
    const instance = new server();
    const entries = Object.entries(handlers).flatMap(([name, handler]) => {
        if (handler === undefined)
            return [];
        // one handler per declared tool; at this boundary its argument and result are plain data
        const call = handler;
        const callable = {
            invoke: async (raw) => ({ kind: "ok", value: await call(raw) }),
        };
        return [[name, callable]];
    });
    instance.attachServerTools(new Map(entries));
    return instance;
}
