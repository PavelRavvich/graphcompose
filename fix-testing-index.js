import fs from "fs";
let content = fs.readFileSync("packages/graphcompose/src/testing/index.ts", "utf-8");
content += '\nexport { VCRMode, VcrChatModel } from "./vcr.js";\n';
fs.writeFileSync("packages/graphcompose/src/testing/index.ts", content);
