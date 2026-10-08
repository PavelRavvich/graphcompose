const fs = require("fs");
let code = fs.readFileSync("packages/graphcompose/src/components/assemble.ts", "utf8");
code = code.replace(
  "...(bundle.compactionPrompt === undefined ? {} : { compactionPrompt: bundle.compactionPrompt }),",
  "...(bundle.compactionPrompt === undefined ? {} : { compactionPrompt: bundle.compactionPrompt }),\n    ...(bundle.needsApproval === undefined ? {} : { needsApproval: bundle.needsApproval }),",
);
fs.writeFileSync("packages/graphcompose/src/components/assemble.ts", code);
