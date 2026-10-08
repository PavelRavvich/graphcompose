import { connectMcpServers } from "../tools/index.js";
import { LiveCallBlockedError } from "./errors.js";
/** The stubs of every MCP server of one test, by server name; shared by the test's apps. */
export class McpStubs {
    book;
    #handlers = new Map();
    #calls = new Map();
    constructor(book) {
        this.book = book;
    }
    stubOf(server) {
        const handlers = this.#handlers.get(server) ?? new Map();
        this.#handlers.set(server, handlers);
        const calls = this.#calls.get(server) ?? [];
        this.#calls.set(server, calls);
        const stub = {
            respond: (given) => {
                for (const [tool, handler] of Object.entries(given)) {
                    // one handler per declared tool; at this boundary its argument and result are plain data
                    if (handler !== undefined)
                        handlers.set(tool, handler);
                }
                return stub;
            },
            calls,
        };
        return stub;
    }
    /** The caller a stubbed server's tools go through: its handler, or a blocked live call. */
    callerOf(server, label) {
        return async (tool, args) => {
            this.stubOf(server);
            this.#calls.get(server)?.push({ tool, args });
            const handler = this.#handlers.get(server)?.get(tool);
            if (handler === undefined) {
                throw this.book.report(new LiveCallBlockedError(`MCP server "${server}" tool "${tool}" has no stub; add mcpOf(${label}).thenReturn({ ${tool}: … })`));
            }
            return { structuredContent: await handler(args), content: [] };
        };
    }
}
/**
 * How a test connects MCP servers: every server is a stub, except the ones named in `real`
 * (connected through their configured transports, contract-checked as in production).
 */
export function stubbedMcpConnect(stubs, labels, real) {
    return async (bundle, config, env) => {
        const stubbed = bundle.mcpServers.filter((handle) => !real.has(handle.name));
        for (const handle of stubbed) {
            handle.bind(stubs.callerOf(handle.name, labels.get(handle.name) ?? handle.name));
        }
        const connected = await connectMcpServers(config.mcpServers, bundle.mcpServers.filter((handle) => real.has(handle.name)), (bundle.serverTools ?? []).filter((facade) => real.has(facade.mcp.server)), env);
        return {
            close: async () => {
                stubbed.forEach((handle) => {
                    handle.bind(undefined);
                });
                await connected.close();
            },
        };
    };
}
