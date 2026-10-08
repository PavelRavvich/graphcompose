const fs = require("fs");
const file = "packages/graphcompose/tests/core/observability-tails.test.ts";
let code = fs.readFileSync(file, "utf-8");

code = code.replace(
  /@WorkflowStart\(\{ name: "Start", input: WorkflowStartText \}\)/,
  '@WorkflowStart({ name: "Start", input: WorkflowStartText, deps: [TailsObserver] })',
);

fs.writeFileSync(file, code);
