const fs = require("fs");
const path = "packages/graphcompose/src/graph/flow-nodes.ts";
let code = fs.readFileSync(path, "utf8");

code = code.replace(
  "readonly options?: { concurrency?: number };",
  "readonly options: { concurrencyLimit: number };",
);

fs.writeFileSync(path, code);
