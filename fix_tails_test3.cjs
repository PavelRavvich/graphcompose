const fs = require("fs");
const file = "packages/graphcompose/tests/core/observability-tails.test.ts";
let code = fs.readFileSync(file, "utf-8");

code = code.replace(/async run\(\)/, "async execute()");

fs.writeFileSync(file, code);
