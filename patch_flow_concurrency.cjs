const fs = require("fs");
const path = "packages/graphcompose/src/graph/flow.ts";
let code = fs.readFileSync(path, "utf8");

code = code.replace(/batchSize/g, "concurrencyLimit");

fs.writeFileSync(path, code);
