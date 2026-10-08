const fs = require("fs");
const glob = require("glob");

const files = glob.sync("packages/graphcompose/src/**/*.ts");
for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  if (content.includes("batchParallel")) {
    content = content.replace(/batchParallel/g, "batchParallel");
    content = content.replace(/BatchParallelStep/g, "BatchParallelStep");
    content = content.replace(/BatchParallelStrategy/g, "BatchParallelStrategy");
    fs.writeFileSync(file, content);
  }
}
