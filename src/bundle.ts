import { agentsConfig } from "./config/agents.config.js";
import type { AgentPrompts, AgentsConfigOf } from "./config/types.js";
import { agentSystemPrompts } from "./prompts/agents.js";
import {
  mcpServerHandles,
  toolRegistry,
  type AnyTool,
  type McpServerHandle,
} from "./tools/index.js";

/**
 * Everything one set of agents needs: config, prompts, the tools it may use, the MCP servers behind
 * its facades and, optionally, which tools wait for a human (pause seam).
 */
export interface AgentBundle<TName extends string = string> {
  readonly config: AgentsConfigOf<TName>;
  readonly prompts: AgentPrompts<TName>;
  readonly tools: readonly AnyTool[];
  readonly mcpServers: readonly McpServerHandle<string>[];
  /** Set to turn the pause seam on; the app supplies an in-process checkpointer. */
  readonly needsApproval?: (tool: AnyTool) => boolean;
}

/** Identity helper: keeps agent names literal so prompts are checked against the config. */
export const defineBundle = <TName extends string>(
  bundle: AgentBundle<TName>,
): AgentBundle<TName> => bundle;

/** The project's own agents (src/config/agents.config.ts). */
export const defaultBundle = defineBundle({
  config: agentsConfig,
  prompts: agentSystemPrompts,
  tools: toolRegistry.tools,
  mcpServers: mcpServerHandles,
});
