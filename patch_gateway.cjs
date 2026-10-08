const fs = require("fs");

const gatewayFile = "packages/graphcompose/src/testing/scripted-gateway.ts";
let code = fs.readFileSync(gatewayFile, "utf-8");

code = code.replace(
  /route\(request: RouterDecisionRequest\): Promise<RouterDecisionResult> \{/,
  "async route(request: RouterDecisionRequest): Promise<RouterDecisionResult> {",
);

code = code.replace(
  /script\.requests\.push\(decisionRequestOf\(request\)\);\n    try \{\n      const turn = script\.next\(\);/,
  "const req = decisionRequestOf(request);\n    script.requests.push(req);\n    try {\n      const turn = await script.next(req);",
);

fs.writeFileSync(gatewayFile, code);
console.log("Patched scripted-gateway.ts");
