const fs = require("fs");
const file = "packages/graphcompose/src/app/create-app.ts";
let code = fs.readFileSync(file, "utf-8");

if (!code.includes("mockedWorkflows?:")) {
  code = code.replace(
    /readonly quorumRouters\?: \(name: string\) => QuorumStrategy \| undefined;/,
    "readonly quorumRouters?: (name: string) => QuorumStrategy | undefined;\n  readonly mockedWorkflows?: ReadonlyMap<Class, (...args: any[]) => any>;",
  );

  code = code.replace(
    /quorumRouters: options\.quorumRouters,/,
    "quorumRouters: options.quorumRouters,\n    mockedWorkflows: options.mockedWorkflows,",
  );

  fs.writeFileSync(file, code);
}
