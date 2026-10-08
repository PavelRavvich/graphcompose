const fs = require("fs");
const path = "packages/graphcompose/src/core/saga.ts";
let code = fs.readFileSync(path, "utf8");

code = code.replace(
  /return \{\n      lastError: null, \/\/ Clear error to finish gracefully after rollback\n    \};/g,
  "return {};",
);

fs.writeFileSync(path, code);
