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
