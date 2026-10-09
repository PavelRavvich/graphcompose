
export class WorkflowCancelledError extends Error {
  override name = "WorkflowCancelledError";
  constructor(message = "Workflow execution was cancelled externally") {
    super(message);
  }
}
