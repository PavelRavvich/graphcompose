### Implementation Details: Fork/Join DSL & Parallel Execution

The implementation for parallel branches is fully complete, typed, and merged. Here are the architectural answers to the review questions:

1. **`agent: "fork-join-system"` - preventing typos**:
   The `agent` string inside `JoinOutput` is now **optional**. If not provided, it will automatically default to `node.name` (the name of the Agent handling the join).

2. **Multimodal models and non-text results (`readonly content: string;`)**:
   We refactored `JoinOutput.contributions` to use `MessageContent` from `@langchain/core/messages` instead of a plain `string`. `MessageContent` natively supports an array of `ContentBlock` objects, enabling image URLs, multimodal inputs, and complex structured blocks perfectly.

3. **Should `ForkOutput` contain FinOps/usage stats?**
   **No.** By design, LangGraph handles Map-Reduce state natively. When multiple branches run in parallel via `Send` packets, LangGraph automatically aggregates `usage` arrays internally and merges them back into the global state. Including FinOps inside `ForkOutput` would lead to double-counting the cost of the branches.

4. **What is `FlowStateUpdate` and where does it come from?**
   `FlowStateUpdate` is the partial state modification returned by the `runner` when an agent finishes execution (e.g. updating `contributions`, `usage`, `payload`, `next`). In our implementation, `visitNode` intercepts this update, executes the `onJoin` method (if present), and uses `mergeJoinUpdate` to cleanly merge the join-specific `contributions` and custom `payload` directly into the current state update.

All tests, strict typing, and linting rules are fully green.
