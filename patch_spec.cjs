const fs = require("fs");
const file =
  "/Users/pavelravvich/.gemini/antigravity-cli/brain/f561aa41-61ce-49e1-bbae-79ca8eb3837b/ticket-158-spec.md";
let code = fs.readFileSync(file, "utf-8");

const additionalSection = `
## Validation & Constraints (Addressing Cycles & State)
- [ ] **Cyclic Dependency Prevention**: At assembly time (\`createApp\`), perform a DFS traversal of all workflow dependencies. If a cycle is detected (e.g., \`Main -> SubA -> SubB -> Main\`), throw a \`WorkflowCycleError\` immediately. Workflows must form a Directed Acyclic Graph (DAG) of definitions.
- [ ] **Stateless Singletons Enforcement**: Workflows and Agents are instantiated as singletons. Execution state must remain strictly within LangGraph's state payload. Documentation must clearly state that components should not mutate instance properties (\`this.x = y\`) to ensure thread-safety across concurrent subgraph invocations.
`;

// Insert before "## Implementation Steps"
code = code.replace("## Implementation Steps", additionalSection + "\n## Implementation Steps");
fs.writeFileSync(file, code);
