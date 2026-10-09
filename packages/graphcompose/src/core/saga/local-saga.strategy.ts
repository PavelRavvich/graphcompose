import { WorkflowAction, type ActionRuntime } from "../../components/decorators.js";
import { componentOf } from "../../components/metadata.js";
import { BaseSagaStrategy } from "./types.js";
import type { AgentState } from "../../graph/state.js";

/**
 * Default monolithic Saga implementation.
 * Iterates through the workflow history backwards and synchronously executes
 * any compensation actions defined on the successfully completed nodes.
 */
@WorkflowAction({ name: "LocalSagaStrategy" })
export class LocalSagaStrategy extends BaseSagaStrategy {
  async execute(state: AgentState<unknown>, context: ActionRuntime) {
    if (!context.getComponentClass || !context.runCompensation) {
      console.warn("LocalSagaStrategy requires framework support for compensations.");
      return {};
    }

    const history = state.history || [];
    // Extract unique node names in reverse order of their execution
    const executedNodes = Array.from(new Set(history.map((h: any) => h.node || h.task).reverse()));

    for (const nodeName of executedNodes) {
      const nodeClass = await context.getComponentClass(nodeName);
      if (!nodeClass) continue;

      const meta = componentOf(nodeClass);
      if (!meta) continue;

      if (meta.kind === "agent" || meta.kind === "action") {
        if (meta.meta.compensate) {
          await context.runCompensation(meta.meta.compensate, state);
        }
      }
    }

    return {};
  }
}
