const fs = require("fs");
const file = "packages/graphcompose/src/graph/build.ts";
let code = fs.readFileSync(file, "utf-8");

code = code.replace(
  /function startEdges\(/,
  `function nodeEdges(builder: Builder, model: FlowModel, node: FlowNodeRef, deps: any): void {
  const next = model.next.get(node.key);
  const id = graphNodeId(node);
  wireEdgesForId(builder, model, node, next, id, deps);

  const isBatchTarget = model.collected.transitions.some(
    (t) => t.next.kind === "batchParallel" && t.next.target === node.key,
  );
  if (isBatchTarget) {
    wireEdgesForId(builder, model, node, next, \`\${id}_batch_finish\`, deps);
  }
}

function startEdges(`,
);

fs.writeFileSync(file, code);
