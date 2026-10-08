const fs = require("fs");
const file = "packages/graphcompose/tests/core/observability-tails.test.ts";
let code = fs.readFileSync(file, "utf-8");

code = code.replace(
  /expect\(agentStart\)\.toBeLessThan\(guardrailStart\);/,
  `
    const agentEnd = hookEvents.indexOf("AgentEnd:SafeAgent");
    expect(agentStart).toBeLessThan(guardrailStart);
`,
);

fs.writeFileSync(file, code);
