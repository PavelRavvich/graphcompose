const fs = require("fs");
const path = require("path");

const wikiDir = "/Users/pavelravvich/projects/langgraph-ts-template.wiki";

const testingAppend = `
## Dynamic Mocking with \`.handle()\`

For complex scenarios, use \`.handle()\` instead of static \`.respond()\` to evaluate incoming requests on the fly and return dynamic responses using strict TypeScript classes:

\`\`\`ts
import { modelOf, callTool, answer, decide } from "@langchain/graphcompose/testing";
import { SupportAgent } from "./support.agent";
import { MainRouter } from "./main.router";
import { MyTool } from "./my-tool";

// Dynamic LLM mocking for agents
modelOf(SupportAgent).handle((req) => {
  if (req.input.includes("issue")) {
    return callTool(MyTool, { action: "fix" });
  }
  return answer("All good!");
});

// Dynamic LLM mocking for routers
modelOf(MainRouter).handle((req) => {
  return decide(SupportAgent);
});
\`\`\`

### Dependency Injection Mocking

For tool and provider dependencies, use SpringBoot-like DI mocking:

\`\`\`ts
import { mockOf } from "@langchain/graphcompose/testing";
import { MyTool } from "./my-tool";

mockOf(MyTool).execute.mockResolvedValue({ success: true });
\`\`\`

### Matchers
Assert on component behaviors using custom test matchers:
\`\`\`ts
// Asserting a tool was called by an agent
expect(modelOf(SupportAgent)).toHaveCalledTools([MyTool]);
\`\`\`

## Blind Spots (Limitations)

When testing with \`graphcompose\`, be aware of the following framework limitations:
1. **Subgraphs are executed fully**: You cannot easily mock out an entire subgraph; testing treats them as fully executable units.
2. **Dependencies built outside DI**: If your code relies on functions like raw \`fetch\` outside of the DI container, they will throw network errors (due to blocked live calls) and cannot be mocked via \`mockOf\`. Always wrap side-effects in injectable classes.
3. **Static graph topology isn't tested natively**: This is black-box testing. The static structure of your graph isn't natively verified aside from its dynamic runtime execution path.
`;

const toolsAppend = `
## Testing

Tools are tested using SpringBoot-like DI mocking provided by the \`graphcompose\` testing toolkit. You can mock a tool's execution method to return specific mocked responses, preventing actual execution.

\`\`\`ts
import { mockOf } from "@langchain/graphcompose/testing";
import { MyTool } from "./my-tool";

// Mock the DI-injected tool's execution to resolve a specific value
mockOf(MyTool).execute.mockResolvedValue({ status: "success" });

// After running your workflow, you can assert on the mock
expect(mockOf(MyTool).execute).toHaveBeenCalledWith(expectedArgs);
\`\`\`
`;

const agentsAppend = `
## Testing

Agents are tested using LLM dynamic mocking. Instead of hitting a real LLM, you can use the \`.handle()\` syntax to intercept requests and conditionally return tool calls or text answers dynamically.

\`\`\`ts
import { modelOf, callTool, answer } from "@langchain/graphcompose/testing";
import { SupportAgent } from "./support.agent";
import { MyTool } from "./my-tool";

// LLM dynamic mocking with .handle()
modelOf(SupportAgent).handle((req) => {
  if (req.input.includes("refund")) {
    return callTool(MyTool, { amount: 100 });
  }
  return answer("I can help with that.");
});

// Asserting the agent's behavior
expect(modelOf(SupportAgent)).toHaveCalledTools([MyTool]);
\`\`\`
`;

const routersAppend = `
## Testing

Routers use the same LLM dynamic mocking approach as agents, but they return routing decisions instead of answers or tool calls.

\`\`\`ts
import { modelOf, decide } from "@langchain/graphcompose/testing";
import { MainRouter } from "./main.router";
import { SupportAgent } from "./support.agent";
import { FallbackAgent } from "./fallback.agent";

// LLM Routing dynamic mocking
modelOf(MainRouter).handle((req) => {
  if (req.input.includes("help")) {
    return decide(SupportAgent);
  }
  return decide(FallbackAgent);
});
\`\`\`
`;

const workflowAppend = `
## Testing

Workflows are tested by mocking the underlying routing and agent behaviors (using \`modelOf\` and \`mockOf\`) and allowing the workflow graph to run to completion. It is a black-box execution test.

\`\`\`ts
import { testWith, modelOf, decide, answer } from "@langchain/graphcompose/testing";
import { MainRouter } from "./main.router";
import { SupportAgent } from "./support.agent";
import { MainWorkflow } from "./main.workflow";

test("Workflow execution", async () => {
  await testWith(MainWorkflow, async ({ app, modelOf }) => {
    // Setup graph behavior dynamically
    modelOf(MainRouter).handle((req) => decide(SupportAgent));
    modelOf(SupportAgent).handle((req) => answer("Resolved"));

    const result = await app.execute({ input: "help" });

    // Assert on the resulting execution path and tools called
    expect(result).toFinishWith(SupportAgent);
    expect(modelOf(SupportAgent)).toHaveCalledTools([]);
  });
});
\`\`\`
`;

const filesToAppend = {
  "Testing.md": testingAppend,
  "Tools.md": toolsAppend,
  "Agents.md": agentsAppend,
  "Routers.md": routersAppend,
  "Workflow.md": workflowAppend,
};

for (const [filename, content] of Object.entries(filesToAppend)) {
  const filePath = path.join(wikiDir, filename);
  if (fs.existsSync(filePath)) {
    fs.appendFileSync(filePath, "\n" + content + "\n");
    console.log("Appended to", filename);
  } else {
    console.log("Skipping", filename, "as it does not exist");
  }
}
