const fs = require("fs");
const file = "packages/graphcompose/src/graph/deps.ts";
let code = fs.readFileSync(file, "utf-8");

if (!code.includes("mockedWorkflows?")) {
  code = code.replace(
    /readonly quorumRouters\?: \(name: string\) => QuorumStrategy \| undefined;/,
    "readonly quorumRouters?: (name: string) => QuorumStrategy | undefined;\n  readonly mockedWorkflows?: ReadonlyMap<Class, (...args: any[]) => any>;",
  );
  fs.writeFileSync(file, code);
}
