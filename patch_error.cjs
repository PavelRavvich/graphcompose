const fs = require("fs");

const fileFlow = "packages/graphcompose/src/graph/flow.ts";
let codeFlow = fs.readFileSync(fileFlow, "utf8");
codeFlow = codeFlow.replace(/errorType: Class \| "any"/g, "errorType: Class");
codeFlow = codeFlow.replace(/errorType: Class \| "any" = "any"/g, "errorType: Class = Error");
fs.writeFileSync(fileFlow, codeFlow);

const fileFlowNodes = "packages/graphcompose/src/graph/flow-nodes.ts";
let codeFlowNodes = fs.readFileSync(fileFlowNodes, "utf8");
codeFlowNodes = codeFlowNodes.replace(/errorType: Class \| "any"/g, "errorType: Class");
fs.writeFileSync(fileFlowNodes, codeFlowNodes);

const fileBuild = "packages/graphcompose/src/graph/build.ts";
let codeBuild = fs.readFileSync(fileBuild, "utf8");
codeBuild = codeBuild.replace(
  /\(catchNode\.errorType === "any" \|\| state\.lastError instanceof catchNode\.errorType\)/g,
  "(state.lastError instanceof catchNode.errorType)",
);
fs.writeFileSync(fileBuild, codeBuild);
