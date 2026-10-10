import { checkFlow } from "../graph/check-flow.js";
import { loadRouters, type LoadedRouter } from "../graph/router-texts.js";
import type { WorkflowDefinition, WorkflowSettings } from "../graph/settings.js";
import type { Class } from "./injection.js";
import type { PromptLoader } from "./prompt-render.js";
import { ComponentError, requireComponent } from "./metadata.js";
import type { AgentMeta, WorkflowMeta } from "./meta-types.js";

/** What a workflow's flow gives assembly: its agents (named as their nodes) and its routers. */
export interface FlowParts {
  readonly actions: readonly { readonly name: string; readonly cls: Class }[];
  readonly agents: readonly AgentMeta[];
  readonly routers: readonly LoadedRouter[];
}

/**
 * Checks the flow (every rule, all violations at once — before any model call) and reads its parts:
 * each agent node's `@Agent` settings under the node's name, and every router with its texts loaded
 * (problems in them are kept in `loader`).
 */
export async function flowOf(bundle: WorkflowMeta, loader: PromptLoader): Promise<FlowParts> {
  const actions: { name: string; cls: Class }[] = [];
  const agents: AgentMeta[] = [];
  const routers = new Map<string, LoadedRouter>();

  const visited = new Set<string>();

  const collect = async (meta: WorkflowMeta) => {
    if (visited.has(meta.name)) return;
    visited.add(meta.name);

    const model = checkFlow(meta.flow);
    const refs = [...model.nodes.values()];

    for (const ref of refs) {
      if (ref.kind === "action") {
        actions.push({ name: ref.name, cls: ref.use });
      } else if (ref.kind === "agent") {
        agents.push({
          ...requireComponent(ref.use, "agent", `@Workflow "${meta.name}"`).meta,
          name: ref.name,
        });
      } else if (ref.kind === "workflow") {
        const subMeta = requireComponent(ref.use, "workflow", "flowOf").meta;
        await collect(subMeta);
      }
    }

    const loadedRouters = await loadRouters(model, loader);
    for (const [k, v] of loadedRouters) {
      if (!routers.has(k)) routers.set(k, v);
    }
  };

  await collect(bundle);
  return { agents, actions, routers: [...routers.values()] };
}

const isDefinition = (value: unknown): value is WorkflowDefinition =>
  typeof value === "object" &&
  value !== null &&
  "settings" in value &&
  typeof value.settings === "function";

/** The workflow's `settings()` (`implements WorkflowDefinition`): limits, model providers. */
export function settingsOf(bundleClass: Class, bundle: WorkflowMeta): WorkflowSettings {
  // a @Workflow class is constructed with no arguments (the decorator's type requires it)
  const instance: unknown = new (bundleClass as unknown as new () => unknown)();
  if (!isDefinition(instance)) {
    throw new ComponentError(
      `@Workflow "${bundle.name}": the class must implement WorkflowDefinition (settings())`,
    );
  }
  return instance.settings();
}
