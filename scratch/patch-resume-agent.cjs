const fs = require("fs");
const path = "packages/graphcompose/src/run/resume-agent.ts";
let content = fs.readFileSync(path, "utf8");

content = content.replace("decision: ToolCallApprovalDecision,", "decision: unknown,");
content = content.replace(
  'import type { ToolCallApprovalDecision } from "../dto/standard/framework.js";\n',
  "",
);

fs.writeFileSync(path, content);
