const fs = require("fs");
const file = "packages/graphcompose/tests/core/observability-tails.test.ts";
let code = fs.readFileSync(file, "utf-8");

code = code.replace(
  /await app\.execute\(StartNode, \{ text: "hi" \}\);/,
  'deps.container.get(TailsObserver);\n    await app.execute(StartNode, { text: "hi" });',
);

fs.writeFileSync(file, code);
