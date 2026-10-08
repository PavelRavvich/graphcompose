const fs = require("fs");
const path = "packages/graphcompose/src/graph/build.ts";
let code = fs.readFileSync(path, "utf8");

code = code.replace(
  "if (state.lastError instanceof catchNode.errorType) {",
  'if (catchNode.kind === "catch" && state.lastError instanceof catchNode.errorType) {',
);

fs.writeFileSync(path, code);
