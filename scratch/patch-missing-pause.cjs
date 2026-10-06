const fs = require("fs");

function replaceInFile(path, replacements) {
  let content = fs.readFileSync(path, "utf8");
  for (const [from, to] of replacements) {
    content = content.replaceAll(from, to);
  }
  fs.writeFileSync(path, content);
}

replaceInFile("packages/graphcompose/src/components/mcp-client.ts", [
  [
    "reportCost: noCost,",
    'reportCost: noCost,\n      pause: () => { throw new Error("MCP tools cannot pause locally"); },',
  ],
]);

replaceInFile("packages/graphcompose/src/testing/slices.ts", [
  [
    "reportCost: () => undefined,",
    'reportCost: () => undefined,\n    pause: () => { throw new Error("Cannot pause in isolated tests"); },',
  ],
]);

replaceInFile("packages/graphcompose/src/app/types.ts", [
  [
    'resume(thread: string, decision: import("../dto/standard/framework.js").ToolCallApprovalDecision, call?: AppCall): Promise<ExecutionOutput>;',
    "resume(thread: string, decision: unknown, call?: AppCall): Promise<ExecutionOutput>;",
  ],
  [
    'resume(thread: string, decision: import("../../graphcompose").ToolCallApprovalDecision, call?: AppCall): Promise<ExecutionOutput>;',
    "resume(thread: string, decision: unknown, call?: AppCall): Promise<ExecutionOutput>;",
  ],
]);

// app/types.ts might import ToolCallApprovalDecision differently, let's just use regex for app/types.ts
let appTypes = fs.readFileSync("packages/graphcompose/src/app/types.ts", "utf8");
appTypes = appTypes.replace(/decision: [^,]+,/, "decision: unknown,");
fs.writeFileSync("packages/graphcompose/src/app/types.ts", appTypes);
