export class ExecutionError extends Error {
  public readonly isFatal: boolean;
  constructor(message: string, options?: { cause?: Error; isFatal?: boolean }) {
    super(message, options);
    this.name = this.constructor.name;
    this.isFatal = options?.isFatal ?? true;
  }
}

// DI / Component Layers
export class ProviderExecutionError extends ExecutionError {}
export class AdapterExecutionError extends ExecutionError {}
export class ToolExecutionError extends ExecutionError {}
export class AgentExecutionError extends ExecutionError {}
export class RouterExecutionError extends ExecutionError {}
export class WorkflowExecutionError extends ExecutionError {}
export class SubgraphExecutionError extends ExecutionError {}

// Domain / Infra
export class InsufficientFundsError extends ExecutionError {}
export class QuorumFailedError extends ExecutionError {}
export class RateLimitExceededError extends ExecutionError {}
