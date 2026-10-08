const fs = require("fs");
let code = fs.readFileSync("packages/graphcompose/tests/graph/fork-join/quorum.test.ts", "utf-8");

code = code.replace(/from\("workflow_start"\)/g, "from(WorkflowStart)");
code = code.replace(/routes\("workflow_finish"\)/g, "routes(WorkflowFinish)");
code = code.replace(/joinQuorum\(1, MyQuorumRouter\)/g, "joinQuorum(MyQuorumRouter, { min: 1 })");
code = code.replace(
  /settings = \(\) => \(\{\}\);/g,
  "settings = () => ({ limits: { steps: 50 }, models: {} as any });",
);
code = code.replace(
  /import { type WorkflowDefinition } from/g,
  "import { WorkflowStart, WorkflowFinish, type WorkflowDefinition } from",
);
code = code.replace(/await testWith/g, "testWith");
code = code.replace(/ComponentScript.turns/g, "ComponentScript.agentTurns");

fs.writeFileSync("packages/graphcompose/tests/graph/fork-join/quorum.test.ts", code);
