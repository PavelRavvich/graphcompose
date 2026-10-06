const fs = require("fs");
const path = "packages/graphcompose/src/graph/agent-loop/tools-node.ts";
let content = fs.readFileSync(path, "utf8");

if (!content.includes("import { interrupt }")) {
  content = content.replace(
    "import type { RunnableConfig }",
    'import { interrupt } from "@langchain/langgraph";\nimport type { RunnableConfig }',
  );
  content = content.replace(
    'import type { AgentLoopUpdate, ToolTask } from "./state.js";',
    'import type { AgentLoopUpdate, ToolTask } from "./state.js";\nimport type { PendingPause } from "../../pause/index.js";',
  );
}

content = content.replace(
  "reportCost: (usd) => {\n        usage.push(recordReportedCost(tool, usd));\n      },",
  `reportCost: (usd) => {\n        usage.push(recordReportedCost(tool, usd));\n      },\n      pause: <TAsk, TAnswer>(ask: TAsk): TAnswer => {\n        const pending: PendingPause = {\n          kind: "interactive",\n          agent: deps.agent.name,\n          tool: tool.name,\n          callId: task.callId,\n          args: task.args,\n          payload: ask,\n        };\n        return interrupt(pending) as TAnswer;\n      },`,
);

fs.writeFileSync(path, content);
