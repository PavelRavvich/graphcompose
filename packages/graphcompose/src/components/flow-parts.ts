import { checkFlow } from "../graph/check-flow.js";
import { loadRouters, type LoadedRouter } from "../graph/router-texts.js";
import type { WorkflowDefinition, WorkflowSettings } from "../graph/settings.js";
import type { Class } from "./injection.js";
import { ComponentError, requireComponent } from "./metadata.js";
import type { AgentMeta, WorkflowMeta } from "./meta-types.js";

/** What a workflow's flow gives assembly: its agents (named as their nodes) and its routers. */
export interface FlowParts {
  readonly agents: readonly AgentMeta[];
  readonly routers: readonly LoadedRouter[];
}

/**
 * Checks the flow (every rule, all violations at once — before any model call) and reads its parts:
 * each agent node's `@Agent` settings under the node's name, and every router with its texts loaded.
 */
export async function flowOf(bundle: WorkflowMeta): Promise<FlowParts> {
  const model = checkFlow(bundle.flow);
  const refs = [...model.nodes.values()];
  const agents = refs
    .filter((ref) => ref.kind === "agent")
    .map((ref) => ({
      ...requireComponent(ref.use, "agent", `@Workflow "${bundle.name}"`).meta,
      name: ref.name,
    }));
  return { agents, routers: [...(await loadRouters(model)).values()] };
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
