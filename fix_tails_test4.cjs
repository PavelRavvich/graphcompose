const fs = require("fs");
const file = "packages/graphcompose/tests/core/observability-tails.test.ts";
let code = fs.readFileSync(file, "utf-8");

code = code.replace(/class SafeTool \{\n  async execute\(\)/, "class SafeTool {\n  async run()");
code = code.replace(
  /class FormatAction \{\n  async run\(\)/,
  "class FormatAction {\n  async execute()",
);

fs.writeFileSync(file, code);
