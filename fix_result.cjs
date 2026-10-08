const fs = require("fs");
const file = "packages/graphcompose/src/app/result.ts";
let code = fs.readFileSync(file, "utf-8");

code = code.replace(
  /case "joinAny":\n    case "joinQuorum":\n    case "catch":\n      return \[\.\.\.step\.from, step\.target\];/,
  'case "joinAny":\n    case "joinQuorum":\n      return [...step.from, step.target];\n    case "catch":\n      return [step.target];',
);

fs.writeFileSync(file, code);
