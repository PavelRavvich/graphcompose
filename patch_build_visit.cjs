const fs = require("fs");
const file = "packages/graphcompose/src/graph/build.ts";
let code = fs.readFileSync(file, "utf-8");

code = code.replace(
  /    builder\.addNode\(graphNodeId\(node\), visitNode\(node, runner, deps, quorumContext\)\);/,
  `    const hasCatches = (model.catches.get(node.key) || []).length > 0;
    const visitDeps = { ...deps, catchesErrors: hasCatches };
    builder.addNode(graphNodeId(node), visitNode(node, runner, visitDeps, quorumContext));`,
);

code = code.replace(
  /        visitNode\(node, runner, deps, quorumContext\),/,
  `        visitNode(node, runner, visitDeps, quorumContext),`,
);

fs.writeFileSync(file, code);
