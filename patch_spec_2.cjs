const fs = require("fs");
const file =
  "/Users/pavelravvich/.gemini/antigravity-cli/brain/f561aa41-61ce-49e1-bbae-79ca8eb3837b/ticket-158-spec.md";
let code = fs.readFileSync(file, "utf-8");

const additionalSection2 = `
## Architectural Decisions (from Discussion)
1. **No Inline Mappers**: To preserve layer isolation, we will NOT add inline lambda mappers. The Parent Graph's state must be structurally compatible with the Child Graph's state (enforced by TypeScript), OR the developer must explicitly use an Adapter Agent before the subgraph.
2. **Interrupts & Checkpointing**: Subgraphs must support pausing (Human-in-the-loop). LangGraph natively checkpoints subgraphs, but we must ensure our \`resume()\` API correctly routes payloads to nested threads. This is a critical Acceptance Criteria.
3. **Global vs Local Limits**: 
   - **Local**: Each subgraph respects its own \`settings().limits.steps\`.
   - **Global**: We will pass the same \`SpendLedger\` (run-scoped singleton) to all subgraphs. This guarantees that global cost and step budgets are strictly enforced, even when multiple subgraphs run concurrently.
4. **Error Bubbling**: Exception handling will be configurable via \`@Workflow({ ... })\` metadata, allowing the graph to define whether specific error types should halt the execution, bubble up to the parent, or trigger compensating actions (future Saga integration).
`;

// Insert before "## Implementation Steps"
code = code.replace("## Implementation Steps", additionalSection2 + "\n## Implementation Steps");
fs.writeFileSync(file, code);
