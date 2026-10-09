import type { Class } from "../components/injection.js";
import { recordComponent } from "../components/metadata.js";

export interface McpServerOptions {
  readonly name: string;
  readonly version: string;
  readonly exports: readonly Class[];
}

/**
 * `@McpServer` — defines an MCP server configuration.
 * Put it on an empty class and pass it to `createMcpService(app, ConfigClass)`
 * to create an agnostic service you can expose over Stdio or HTTP.
 */
export function McpServer(options: McpServerOptions) {
  return <C extends Class>(target: C): C => {
    recordComponent(target, {
      kind: "mcp-server-config",
      meta: options,
    } as unknown as import("../components/metadata.js").ComponentMeta);
    return target;
  };
}
