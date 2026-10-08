const fs = require("fs");
let c = fs.readFileSync("packages/graphcompose/src/graph/build.ts", "utf8");

const target = `function nodeEdges(builder: Builder, model: FlowModel, node: FlowNodeRef): void {\n    wireEdgesForId(builder, model, node, next, id);\n\n  const isBatchTarget = model.collected.transitions.some(t => t.next.kind === "batchParallel" && t.next.target === node.key);\n  if (isBatchTarget) {\n    wireEdgesForId(builder, model, node, next, \`\${id}_batch_finish\`);\n  }\n}`;

const replacement = `function nodeEdges(builder: Builder, model: FlowModel, node: FlowNodeRef): void {
  const next = model.next.get(node.key);
  const id = graphNodeId(node);
  wireEdgesForId(builder, model, node, next, id);

  const isBatchTarget = model.collected.transitions.some(t => t.next.kind === "batchParallel" && t.next.target === node.key);
  if (isBatchTarget) {
    wireEdgesForId(builder, model, node, next, \`\${id}_batch_finish\`);
  }
}`;

c = c.replace(target, replacement);
fs.writeFileSync("packages/graphcompose/src/graph/build.ts", c);
