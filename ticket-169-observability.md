# Ticket 169: Comprehensive Observability Matrix

## The Problem

We need deep, read-only visibility into every stage of the application's lifecycle. Rather than listing just a few hooks for agents, we need a universal telemetry matrix where **every** distinct entity in the framework emits a "Start" and "End" event, passing an exhaustive state snapshot.

## The Solution: Universal Hook Matrix

An observer is a class listed in `@Workflow({ observers: [...] })` that implements any subset of these hooks (one interface per hook, `WorkflowObserver` = all of them, optional); only listed classes are called, and assembly rejects one with no hook or a misspelled hook (#203). The payload types are `AgentStartEvent`, `ToolEndEvent`, … in `graphcompose/core`. Every hook receives the full `AppState` (RunId, ThreadId, Graph Variables, History) plus context-specific metadata.

### 1. Workflow Level

- `onWorkflowStart(state: AppState)`
- `onWorkflowEnd(result: any, state: AppState)`

### 2. Node Level (Agents & Routers)

- `onAgentStart(ctx: NodeContext)` / `onAgentEnd(ctx: NodeResultContext)`
- `onRouterStart(ctx: NodeContext)` / `onRouterEnd(ctx: NodeResultContext)`

### 3. Tool Execution Level

- `onToolStart(ctx: ToolRunContext)`: Includes tool arguments and the calling agent.
- `onToolEnd(ctx: ToolResultContext)`: Includes the tool's result.

### 4. AI/Model Level (The universal AI interceptor)

- `onModelStart(req: ModelRequest)`: Triggers whenever an LLM or Embedding model is called, regardless of who called it (Agent, Router, or RAG). Includes `callerName`.
- `onModelEnd(res: ModelResponse)`: Includes token usage, latency, and cost.

### 5. RAG Level

- `onRagStart(ctx: NodeContext)` / `onRagEnd(ctx: NodeResultContext)`

### 6. Global Error Catcher

- `onError(error: Error, state: AppState)`: Catches any unhandled exception across the graph execution.

## The Context Objects

```typescript
export interface AppState {
  readonly runId: string;
  readonly threadId?: string;
  readonly activeNode?: string;
  readonly variables?: Record<string, any>;
  readonly history?: any[];
}
```

_Note: Contexts like `ModelRequest` and `ToolRunContext` extend this by adding specific fields like `rawPayload`, `modelName`, or `arguments` while keeping `state: AppState` as a property._

## Usage Example

```typescript
@Injectable()
export class DatadogTracer implements OnWorkflowStart, OnToolStart, OnModelEnd, OnError {
  async onWorkflowStart(state) {
    /* log runId start */
  }
  async onToolStart(ctx) {
    /* log which tool is being used by which agent */
  }
  async onModelEnd(res) {
    /* bill the specific threadId for tokens */
  }
  async onError(err, state) {
    /* alert engineering with full variables snapshot */
  }
}
```
