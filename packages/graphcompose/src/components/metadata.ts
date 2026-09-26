import type { McpServerConfig } from "../config/types.js";
import type { ToolEffect } from "../tools/index.js";
import type { z } from "zod";
import type { ServerTools } from "./mcp-client.js";
import type { Class, Token } from "./injection.js";
import type { AgentMeta, WorkflowMeta } from "./meta-types.js";

export interface ToolMeta {
  readonly name: string;
  readonly description: string;
  readonly effect?: ToolEffect;
  readonly timeoutMs?: number;
  readonly input: z.ZodType;
  readonly output: z.ZodType;
  readonly deps: readonly Token[];
}

/** `@McpTool`: a tool whose server is among its dependencies. */
export interface McpToolMeta extends ToolMeta {
  readonly server: Class;
}

/** What a decorator recorded about a class. */
export type ComponentMeta =
  | { readonly kind: "tool"; readonly meta: ToolMeta }
  | {
      readonly kind: "mcp-server";
      readonly meta: {
        readonly name: string;
        readonly config: McpServerConfig;
        readonly tools: ServerTools;
      };
    }
  | { readonly kind: "mcp-tool"; readonly meta: McpToolMeta }
  | { readonly kind: "agent"; readonly meta: AgentMeta }
  | { readonly kind: "injectable"; readonly meta: { readonly deps: readonly Token[] } }
  | {
      readonly kind: "rag";
      readonly meta: {
        readonly name: string;
        readonly description: string;
        readonly k: number;
        readonly deps: readonly Token[];
      };
    }
  | { readonly kind: "workflow"; readonly meta: WorkflowMeta };

/** Decorator metadata per class. Symbol.metadata is not available at runtime on Node 26. */
const components = new WeakMap<object, ComponentMeta>();

export const recordComponent = (target: object, meta: ComponentMeta): void => {
  components.set(target, meta);
};

export const componentOf = (target: object): ComponentMeta | undefined => components.get(target);

export class ComponentError extends Error {
  override name = "ComponentError";
}

export function requireComponent<K extends ComponentMeta["kind"]>(
  target: Class,
  kind: K,
  where: string,
): Extract<ComponentMeta, { kind: K }> {
  const meta = componentOf(target);
  if (meta?.kind !== kind) {
    throw new ComponentError(
      `${where}: ${target.name || "(anonymous class)"} is not a @${kindName[kind]} component`,
    );
  }
  return meta as Extract<ComponentMeta, { kind: K }>;
}

const kindName: Readonly<Record<ComponentMeta["kind"], string>> = {
  tool: "Tool",
  "mcp-server": "McpServer",
  "mcp-tool": "McpTool",
  agent: "Agent",
  injectable: "Injectable",
  rag: "Rag",
  workflow: "Workflow",
};
