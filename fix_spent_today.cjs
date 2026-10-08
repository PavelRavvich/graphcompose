const fs = require("fs");
const file = "packages/graphcompose/src/graph/flow-runners.ts";
let code = fs.readFileSync(file, "utf-8");

code = code.replace(
  /spentToday: async \(\) => 0 \/\/ passed correctly in real impl/,
  "spentToday: deps.spentToday",
);

fs.writeFileSync(file, code);
