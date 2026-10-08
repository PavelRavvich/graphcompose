const fs = require("fs");
const path = "packages/graphcompose/src/components/meta-types.ts";
let code = fs.readFileSync(path, "utf8");

code = code.replace(
  "export interface WorkflowActionMeta {\n  readonly name: string;",
  "export interface WorkflowActionMeta {\n  readonly name: string;\n  readonly compensate?: Class;",
);

fs.writeFileSync(path, code);
