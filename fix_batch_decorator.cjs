const fs = require("fs");
const path = "packages/graphcompose/src/concurrency/batch.decorator.ts";
let code = fs.readFileSync(path, "utf8");

code = code.replace(/BatchParallelStrategy/g, "MapEachStrategy");
code = code.replace(/BatchStrategy/g, "MapEachStrategy");
code = code.replace(/batchStrategies/g, "mapEachStrategies");
code = code.replace(/batchStrategyMetaOf/g, "mapEachStrategyMetaOf");

fs.writeFileSync(path, code);
