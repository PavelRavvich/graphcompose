import { WorkflowAction, type IWorkflowAction, type WorkflowActionContext } from "../components/decorators.js";
import type { FlowStateType } from "../graph/visit.js";

@WorkflowAction({ name: "SagaOrchestrator" })
export class SagaOrchestrator implements IWorkflowAction {
  async execute(state: FlowStateType, context: WorkflowActionContext) {
     // TODO: Implement reflection to get compensate classes and invoke them
     console.log("TRIGGERING SAGA for path:", state.path);
     return {
        // clear error so it doesn't loop?
        // lastError: null
     };
  }
}
