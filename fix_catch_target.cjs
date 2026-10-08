const fs = require("fs");

const path = "packages/graphcompose/src/graph/flow.ts";
let code = fs.readFileSync(path, "utf8");
code = code.replace("readonly nextNode: ChoiceTarget;", "readonly nextNode: FlowNode;");
code = code.replace(
  "next: (nextNode: ChoiceTarget) => CatchStep",
  "next: (nextNode: FlowNode) => CatchStep",
);
fs.writeFileSync(path, code);

const path2 = "packages/graphcompose/src/graph/flow-nodes.ts";
let code2 = fs.readFileSync(path2, "utf8");
code2 = code2.replace(
  "const nextNode = resolve(unwrapTarget(step.nextNode));",
  "const nextNode = resolve(step.nextNode);",
);
fs.writeFileSync(path2, code2);
