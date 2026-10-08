const fs = require("fs");

const path1 = "packages/graphcompose/src/graph/flow.ts";
let code1 = fs.readFileSync(path1, "utf8");
code1 = code1.replace("readonly errorType: Class;", 'readonly errorType: Class | "any";');
fs.writeFileSync(path1, code1);

const path2 = "packages/graphcompose/src/graph/flow-nodes.ts";
let code2 = fs.readFileSync(path2, "utf8");
code2 = code2.replace("readonly errorType: Class;", 'readonly errorType: Class | "any";');
fs.writeFileSync(path2, code2);

const path3 = "packages/graphcompose/src/graph/build.ts";
let code3 = fs.readFileSync(path3, "utf8");
code3 = code3.replace(
  'catchNode.kind === "catch" && state.lastError instanceof catchNode.errorType',
  'catchNode.kind === "catch" && (catchNode.errorType === "any" || state.lastError instanceof catchNode.errorType)',
);
fs.writeFileSync(path3, code3);
