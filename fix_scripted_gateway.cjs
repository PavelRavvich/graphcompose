const fs = require("fs");
const path = "packages/graphcompose/src/testing/scripted-gateway.ts";
let code = fs.readFileSync(path, "utf8");
code = code.replace(
  "import type { ComponentScript, ScriptBook }",
  "import type { ComponentScript, ScriptBook, ModelRequest }",
);
fs.writeFileSync(path, code);
