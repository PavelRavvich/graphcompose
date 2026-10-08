const fs = require("fs");
const path = "packages/graphcompose/src/concurrency/batch.decorator.ts";
let code = fs.readFileSync(path, "utf8");

code = code.replace(/BatchParallelStrategy/g, "BatchParallelStrategy");
code = code.replace(/BatchStrategy/g, "BatchParallelStrategy");
code = code.replace(/batchStrategies/g, "batchParallelStrategies");
code = code.replace(/batchStrategyMetaOf/g, "batchParallelStrategyMetaOf");

fs.writeFileSync(path, code);
