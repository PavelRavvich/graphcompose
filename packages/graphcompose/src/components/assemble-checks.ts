import { ComponentError, requireComponent, type ToolMeta } from "./metadata.js";
import { tokenName, type Class } from "./injection.js";
import type { AgentMeta, WorkflowMeta } from "./meta-types.js";
import { renderPromptVariables } from "./prompt-render.js";

/** A workflow's tool classes: local `@Tool`s and `@McpTool`s. */
export interface ToolClasses {
  readonly local: readonly Class[];
  readonly mcp: readonly Class[];
}

/** Tool classes → their tool names. */
export const toolNames = (tools: ToolClasses, rags: readonly Class[]): Map<Class, string> => {
  const map = new Map<Class, string>();
  const byName = new Map<string, Class>();

  const add = (cls: Class, name: string): void => {
    const existing = byName.get(name);
    if (existing !== undefined && existing !== cls) {
      throw new ComponentError(
        `[tool.duplicate-name] Duplicate tool name "${name}" found in classes ${tokenName(existing)} and ${tokenName(cls)}. Tool names must be unique across the workflow.`,
      );
    }
    byName.set(name, cls);
    map.set(cls, name);
  };

  tools.local.forEach((cls) => {
    add(cls, requireComponent(cls, "tool", "workflowOf").meta.name);
  });
  tools.mcp.forEach((cls) => {
    add(cls, requireComponent(cls, "mcp-tool", "workflowOf").meta.name);
  });
  rags.forEach((cls) => {
    add(cls, requireComponent(cls, "rag", "workflowOf").meta.name);
  });

  return map;
};

/** Every class the container creates for the workflow, for the dependency graph check. */
export const componentClassesOf = (
  bundle: WorkflowMeta,
  agents: readonly AgentMeta[],
  tools: ToolClasses,
  rags: readonly Class[],
  actions: readonly { readonly cls: Class }[],
): Class[] => [
  ...tools.local,
  ...tools.mcp,
  ...rags,
  ...actions.map((a) => a.cls),
  ...(bundle.observers ?? []),
  ...(bundle.guardrails ?? []),
  ...(bundle.piiPolicies ?? []),
  ...(bundle.channelClasses ?? []),
  ...agents.flatMap((a) => a.guardrails ?? []),
  ...agents.flatMap((a) => a.overrideGuardrails ?? []),
  ...agents.flatMap((a) => a.piiPolicies ?? []),
  ...agents.flatMap((a) => a.overridePiiPolicies ?? []),
];

/** Each agent's prompt with the workflow's and the agent's own `{{variables}}` filled in. */
export const promptsOf = (
  bundle: WorkflowMeta,
  agents: readonly AgentMeta[],
): Record<string, ReturnType<typeof renderPromptVariables>> =>
  Object.fromEntries(
    agents.map(
      (agent) =>
        [
          agent.name,
          renderPromptVariables(agent.name, agent, agent.source, {
            ...(bundle.promptVariables ?? {}),
            ...(agent.promptVariables ?? {}),
          }),
        ] as const,
    ),
  );

/** Every tool with a channel must use one of the workflow's `channelClasses`. */
export function checkToolChannels(bundle: WorkflowMeta, tools: ToolClasses): void {
  const declaredChannels = new Set(
    (bundle.channelClasses ?? []).map(
      (cls) => requireComponent(cls, "channel", "workflowOf").meta.name,
    ),
  );
  const check = (decorator: string, meta: ToolMeta): void => {
    if (!meta.channel) return;
    const channelMeta = requireComponent(meta.channel, "channel", "workflowOf").meta;
    if (!declaredChannels.has(channelMeta.name)) {
      throw new ComponentError(
        `${decorator} "${meta.name}" references a channel not listed in @Workflow channelClasses`,
      );
    }
  };
  for (const cls of tools.local) check("@Tool", requireComponent(cls, "tool", "workflowOf").meta);
  for (const cls of tools.mcp) {
    check("@McpTool", requireComponent(cls, "mcp-tool", "workflowOf").meta);
  }
}
