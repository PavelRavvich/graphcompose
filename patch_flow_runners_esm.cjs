const fs = require("fs");
const file = "packages/graphcompose/src/graph/flow-runners.ts";
let code = fs.readFileSync(file, "utf-8");

code = code.replace(
  /const \{ flowGraphOf \} = require\("\.\/flow-runtime\.js"\);/,
  'const { flowGraphOf } = await import("./flow-runtime.js");',
);
fs.writeFileSync(file, code);
