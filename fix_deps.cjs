const fs = require("fs");
const path = "packages/graphcompose/src/graph/deps.ts";
let code = fs.readFileSync(path, "utf8");
code = code.replace(/BatchParallelStrategy/g, "MapEachStrategy");
fs.writeFileSync(path, code);
