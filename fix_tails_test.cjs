const fs = require("fs");
const file = "packages/graphcompose/tests/core/observability-tails.test.ts";
let code = fs.readFileSync(file, "utf-8");

code = code.replace(
  /@WorkflowStart\(\{ name: "Start" \}\)/,
  '@WorkflowStart({ name: "Start", input: WorkflowStartText })',
);
code = code.replace(
  /@WorkflowFinish\(\{ name: "Finish" \}\)/,
  '@WorkflowFinish({ name: "Finish", output: WorkflowFinishText })',
);

fs.writeFileSync(file, code);
