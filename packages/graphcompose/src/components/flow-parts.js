import { checkFlow } from "../graph/check-flow.js";
import { loadRouters } from "../graph/router-texts.js";
import { ComponentError, requireComponent } from "./metadata.js";
/**
 * Checks the flow (every rule, all violations at once — before any model call) and reads its parts:
 * each agent node's `@Agent` settings under the node's name, and every router with its texts loaded.
 */
export async function flowOf(bundle) {
    const model = checkFlow(bundle.flow);
    const refs = [...model.nodes.values()];
    const actions = refs
        .filter((ref) => ref.kind === "action")
        .map((ref) => ({
        name: ref.name,
        cls: ref.use,
    }));
    const agents = refs
        .filter((ref) => ref.kind === "agent")
        .map((ref) => ({
        ...requireComponent(ref.use, "agent", `@Workflow "${bundle.name}"`).meta,
        name: ref.name,
    }));
    return { agents, actions, routers: [...(await loadRouters(model)).values()] };
}
const isDefinition = (value) => typeof value === "object" &&
    value !== null &&
    "settings" in value &&
    typeof value.settings === "function";
/** The workflow's `settings()` (`implements WorkflowDefinition`): limits, model providers. */
export function settingsOf(bundleClass, bundle) {
    // a @Workflow class is constructed with no arguments (the decorator's type requires it)
    const instance = new bundleClass();
    if (!isDefinition(instance)) {
        throw new ComponentError(`@Workflow "${bundle.name}": the class must implement WorkflowDefinition (settings())`);
    }
    return instance.settings();
}
