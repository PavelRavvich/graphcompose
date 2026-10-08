const fs = require("fs");
const file = "packages/graphcompose/tests/core/observability-tails.test.ts";
let code = fs.readFileSync(file, "utf-8");

code = code.replace(
  /expect\(agentStart\)\.toBeLessThan\(piiStart\);[\s\S]*/,
  `
    expect(agentStart).toBeLessThan(guardrailStart);
    expect(guardrailStart).toBeLessThan(toolStart);
    expect(toolStart).toBeLessThan(toolEnd);
    const guardrailEnd2 = hookEvents.lastIndexOf("GuardrailEnd:SafeGuard");
    expect(toolEnd).toBeLessThan(guardrailEnd2);
    expect(guardrailEnd2).toBeLessThan(agentEnd);
    
    await app.close();
  });
});
`,
);

fs.writeFileSync(file, code);
