export class WorkflowCancelledError extends Error {
    name = "WorkflowCancelledError";
    constructor(message = "Workflow execution was cancelled externally") {
        super(message);
    }
}
