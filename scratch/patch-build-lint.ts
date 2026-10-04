import fs from "fs";

let text = fs.readFileSync("packages/graphcompose/src/graph/build.ts", "utf8");
text = text.replace(/import \{ Send \} from "@langchain\/core\/messages";\n/, "");
text = text.replace(/as string/g, "!");

fs.writeFileSync("packages/graphcompose/src/graph/build.ts", text);
