### Specification for Stage 1: Complex Branch Paths, Detached Executions, and Multiple Finishes

Based on discussions, we are migrating from the strict, single-line `fork(...).join(...)` model to a more flexible topology using parallel `to(...)` and independent `join(...)` barriers, allowing detached executions (fire-and-forget) and multiple finishes naturally.

#### 1. Multiple WorkflowFinishes

- A graph can now declare multiple `@WorkflowFinish` nodes.
- **Run Result:** The return type of `run(...)` changes from a single DTO to a map keyed by the Finish node names.
  _Example:_ If a graph has `AnswerFinish` and `AuditFinish`, `run()` returns `{ answer: AnswerDto, audit: AuditDto }`.
- **Completion:** The LangGraph run naturally terminates when there are no active nodes left executing (all paths have either reached a Finish or hit an error).

#### 2. Parallel `to(...)`

- Replaces the concept of `fork` by allowing multiple targets in a standard `to` transition.
  _Example:_ `from(Planner).to(Research, Risk, Report)`
- All specified targets are launched in parallel.

#### 3. Independent `join(...)` Barrier

- A `join` is no longer statically tied to a `fork`. It is a property of the receiving node.
  _Example:_ `from(Research, Risk).join(Synthesis)`
- **Behavior:** The `Synthesis` node acts as a barrier. It waits until all declared upstream paths (`Research` and `Risk`) have either arrived at the barrier or have permanently diverted to a `WorkflowFinish`.
- **Handler:** `Synthesis` implements `JoinHandler<JoinOutputs<{ research: string, risk: RiskDto }>>`. Note: Keys might be absent if a path diverted (e.g. through a router) before reaching the join.

#### Out of Scope for this Ticket (Future Stages)

- `choose` with multiple active targets (e.g., `together(A, B)`) -> Stage 2.
- Dynamic runtime scatter-gather (`mapEach` / invoking the same agent N times) -> Stage 3 (Issue #162).
- Advanced join policies (`quorum`, `first`) and manual path cancellation.

This covers all Acceptance Criteria of #168 in a scalable way that supports future distributed/remote execution patterns.

### Update:

- Renamed \`Interceptor\` to \`Adapter\` (e.g. \`InboundChannelAdapter\`) to distinguish from servlet-like filter chains.
- Exported \`End = Skip\` in routing for better workflow readability.
- Guardrails and PiiPolicies can now be applied globally at the \`@Workflow\` level.
- Tools can now declare \`guardrails\` and \`piiPolicies\` within \`@Tool({...})\` options.
- The order of policy execution is: Workflow -> Agent -> Tool.
- Added \`overrideGuardrails\` and \`overridePiiPolicies\` to Agent and Tool definitions to allow complete replacement of inherited policies.
- Added \`disableGuardrails\` and \`disablePiiPolicies\` to Agent and Tool definitions to allow pinpoint disabling of specific inherited policy classes without needing to override the entire chain.

### Update 2: Lifecycle Hooks (OnInit, AfterAssemble)

Added Angular-style lifecycle hooks for all DI components, enabling components (Tools, Services, Knowledge Bases, Guardrails, etc.) to hook into the workflow assembly process without blocking synchronous instantiation.

Available hooks (all can return `Promise<void>` or `void`):

1. `onInit()` — Triggered for every created DI component in dependency-first order immediately after the container resolves all singletons.
2. `afterAssemble()` — Triggered for every created component after all `onInit` hooks complete.
3. `onStart()` — Triggered when the graph/app execution actually starts serving/running.
4. `onStop()` — Triggered when the app/graph stops, in reverse-dependency order.

### Agent Loop Lifecycle Sequence

The exact lifecycle of a paused tool call is as follows:

1. Agent decides to call a tool.
2. All `Guardrail.beforeToolCall` hooks are triggered.
3. The graph encounters a defined channel, pauses execution, and waits for user input.
4. The system resumes execution via `app.resume(payload)`.
5. The `Adapter.interpret(payload)` runs (formerly `Interceptor`), translating raw input into a decision.
6. All `PiiPolicy.mask` and `maskJson` hooks run, masking the feedback and arguments.
7. All `Guardrail.onChannelDecision` hooks run, evaluating the _already masked_ data.
8. The underlying Tool code executes.
9. All `Guardrail.afterToolCall` hooks run.
