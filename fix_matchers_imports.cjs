const fs = require("fs");
const file = "packages/graphcompose/src/testing/matchers.ts";
let code = fs.readFileSync(file, "utf-8");

code = code.replace(/const { componentOf } = require\('\.\.\/components\/metadata\.js'\);/g, "");
code = code.replace(/const { nodeNameOf } = require\('\.\/failure-facts\.js'\);/g, "");

if (!code.includes("import { componentOf }")) {
  code = code.replace(
    /import { failureFactsOf, nodeNameOf } from "\.\/failure-facts\.js";/,
    'import { failureFactsOf, nodeNameOf } from "./failure-facts.js";\nimport { componentOf } from "../components/metadata.js";',
  );
}

fs.writeFileSync(file, code);
