const fs = require("fs");
const path = "packages/graphcompose/src/core/saga.ts";
let code = fs.readFileSync(path, "utf8");

code = code.replace("return { lastError: null };", "return {};");
code = code.replace("return { lastError: null };", "return {};");

fs.writeFileSync(path, code);
