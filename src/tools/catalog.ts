import { createCurrentTimeTool } from "./examples/current-time.js";
import { isMcpFacade, type McpFacade, type McpServerHandle } from "./mcp/facade.js";
import { createToolRegistry, type ToolNameOf } from "./registry.js";

/**
 * MCP servers the project uses. Example (server config goes to `mcpServers` in agents.config.ts):
 *
 *   const github = mcpServer("github");
 *   const listPullRequests = github.tool({
 *     tool: "list_pull_requests",
 *     description: "Open pull requests of a repository",
 *     input: z.object({ owner: z.string(), repo: z.string() }),
 *     output: z.string(),               // required; z.string() = text only the model reads
 *   });
 *   export const mcpServerHandles = [github];   // and add listPullRequests to the registry below
 */
export const mcpServerHandles: readonly McpServerHandle<string>[] = [];

/** Every tool the project offers to its agents. Add a tool here, then list it on an agent. */
export const toolRegistry = createToolRegistry([createCurrentTimeTool()]);

export type ToolName = ToolNameOf<typeof toolRegistry>;

/** MCP facades among the registered tools — connected and checked at startup. */
export const mcpFacades = (): McpFacade[] => toolRegistry.tools.filter(isMcpFacade);
