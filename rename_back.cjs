const fs = require("fs");
const execSync = require("child_process").execSync;

const files = execSync('git grep -l "mapEach"')
  .toString()
  .split("\n")
  .filter((f) => f.trim() !== "");

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  content = content.replace(/mapEach/g, "batchParallel");
  content = content.replace(/MapEach/g, "BatchParallel");
  fs.writeFileSync(file, content);
}
