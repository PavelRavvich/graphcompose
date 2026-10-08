import { WorkflowAction, type IWorkflowAction, type WorkflowActionContext } from "../components/decorators.js";
import { componentOf } from "../components/metadata.js";

@WorkflowAction({ name: "SagaOrchestrator" })
export class SagaOrchestrator implements IWorkflowAction {
  async execute(state: any, context: WorkflowActionContext) {
    if (!context.getComponentClass || !context.runCompensation) {
       console.warn("SAGA Orchestrator requires framework support for compensations.");
       return { lastError: null };
    }

    const path = state.path || [];
    
    // Iterate backwards
    for (let i = path.length - 1; i >= 0; i--) {
       const nodeName = path[i];
       const nodeClass = await context.getComponentClass(nodeName);
       if (!nodeClass) continue;
       
       const meta = componentOf(nodeClass);
       if (!meta) continue;

       // If the component defines a compensation, run it!
       if (meta.kind === "agent" && meta.meta.compensate) {
          await context.runCompensation(meta.meta.compensate, state);
       } else if (meta.kind === "action" && meta.meta.compensate) {
          await context.runCompensation(meta.meta.compensate, state);
       }
    }

    return {
       lastError: null // Clear error to finish gracefully after rollback
    };
  }
}
