const fs = require("fs");
const path = "packages/graphcompose/src/graph/build.ts";
let code = fs.readFileSync(path, "utf8");
code = code.replace(
  "builder.addConditionalEdges(id, (state) => state.route);",
  "builder.addConditionalEdges(id, (state: any) => state.next);",
);
code = code.replace("return state.route;", "return state.next;");
fs.writeFileSync(path, code);
