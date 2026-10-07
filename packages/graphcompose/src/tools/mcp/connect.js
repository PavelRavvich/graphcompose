import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { z } from "zod";
import { schemaDifferences } from "./compat.js";
import { McpContractError, McpUnavailableError } from "./errors.js";
function requireEnv(server, names, env) {
    const values = {};
    for (const name of names) {
        const value = env[name];
        if (value === undefined || value === "") {
            throw new McpUnavailableError(`MCP server "${server}" needs env variable ${name}, which is not set`);
        }
        values[name] = value;
    }
    return values;
}
/** stdio: env lists variable names; http: headers map header → env variable name. */
export const defaultTransport = (name, server, env) => {
    if (server.transport === "stdio") {
        return new StdioClientTransport({
            command: server.command,
            args: server.args ?? [],
            env: requireEnv(name, server.env ?? [], env),
        });
    }
    const headerVars = server.headers ?? {};
    const values = requireEnv(name, Object.values(headerVars), env);
    const headers = Object.fromEntries(Object.entries(headerVars).map(([header, variable]) => [header, values[variable] ?? ""]));
    return new StreamableHTTPClientTransport(new URL(server.url), { requestInit: { headers } });
};
function contractProblems(facades, listed) {
    const byName = new Map(listed.map((tool) => [tool.name, tool]));
    return facades.flatMap((facade) => {
        const remote = byName.get(facade.mcp.tool);
        const where = `${facade.name} (${facade.mcp.server}.${facade.mcp.tool})`;
        if (remote === undefined)
            return [`${where}: tool not found on the server`];
        const input = schemaDifferences(z.toJSONSchema(facade.input, { io: "input" }), remote.inputSchema);
        const output = remote.outputSchema === undefined
            ? []
            : schemaDifferences(z.toJSONSchema(facade.output), remote.outputSchema);
        return [
            ...input.map((p) => `${where} input: ${p}`),
            ...output.map((p) => `${where} output: ${p}`),
        ];
    });
}
async function openClient(name, transport) {
    const client = new Client({ name: "langgraph-ts-template", version: "0.1.0" });
    try {
        await client.connect(transport);
        const { tools } = await client.listTools();
        return { client, tools };
    }
    catch (error) {
        await client.close().catch(() => undefined);
        const reason = error instanceof Error ? error.message : String(error);
        throw new McpUnavailableError(`Cannot connect to MCP server "${name}": ${reason}`);
    }
}
const callerFor = (client) => (tool, args, signal) => client.callTool({ name: tool, arguments: args }, undefined, { signal });
/**
 * Connects every server used by a facade, checks contracts and binds the facades.
 * Any unavailable server or contract difference stops startup (fail fast).
 */
export async function connectMcpServers(servers, handles, facades, env, makeTransport = defaultTransport) {
    const clients = [];
    const closeAll = async () => {
        handles.forEach((handle) => {
            handle.bind(undefined);
        });
        await Promise.all(clients.map((client) => client.close()));
    };
    try {
        for (const handle of handles) {
            const used = facades.filter((facade) => facade.mcp.server === handle.name);
            if (used.length === 0)
                continue;
            const config = servers?.[handle.name];
            if (config === undefined) {
                throw new McpUnavailableError(`MCP server "${handle.name}" is used by facades but missing in mcpServers`);
            }
            const { client, tools } = await openClient(handle.name, makeTransport(handle.name, config, env));
            clients.push(client);
            const problems = contractProblems(used, tools);
            if (problems.length > 0)
                throw new McpContractError(`MCP contract drift:\n- ${problems.join("\n- ")}`);
            handle.bind(callerFor(client));
        }
    }
    catch (error) {
        await closeAll();
        throw error;
    }
    return { close: closeAll };
}
