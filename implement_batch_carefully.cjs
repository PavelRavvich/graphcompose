const fs = require('fs');
let c = fs.readFileSync('packages/graphcompose/src/graph/build.ts', 'utf8');

c = c.replace(
  `  for (const node of model.nodes.values()) {\n    const { runner, maxVisits } = runnerOf(node, model, runtime, routers);\n    const deps = {\n      limits,\n      spentToday: runtime.spentToday,\n      ...(maxVisits === undefined ? {} : { maxVisits }),\n    };\n    builder.addNode(graphNodeId(node), visitNode(node, runner, deps));\n  }`,
  `  for (const node of model.nodes.values()) {\n    const { runner, maxVisits } = runnerOf(node, model, runtime, routers);\n    const deps = {\n      limits,\n      spentToday: runtime.spentToday,\n      ...(maxVisits === undefined ? {} : { maxVisits }),\n    };\n    builder.addNode(graphNodeId(node), visitNode(node, runner, deps));\n\n    const isBatchTarget = model.collected.transitions.some(t => t.next.kind === "batchParallel" && t.next.target === node.key);\n    if (isBatchTarget) {\n      builder.addNode(\`\${graphNodeId(node)}_batch_clone\`, visitNode(node, runner, deps));\n    }\n  }`
);

const batchLogic = `
  if (next.kind === "batchParallel") {
    const targetNode = nodeKeyed(model, next.target);
    const targetId = graphNodeId(targetNode);
    const concurrency = next.options?.concurrency ?? 5;
    const cloneId = \`\${targetId}_batch_clone\`;
    const managerId = \`batch_manager.\${targetId}.\${node.key}\`;
    const loopId = \`batch_loop.\${targetId}.\${node.key}\`;

    builder.addEdge(id, managerId);

    builder.addNode(managerId, (state) => {
      const existing = state._batchCursor?.[managerId];
      if (existing) return {};
      const items = next.extractor(state.payload);
      return { _batchCursor: { [managerId]: { queue: items, offset: 0 } } };
    });

    builder.addConditionalEdges(managerId, (state) => {
      const cursor = state._batchCursor[managerId];
      if (!cursor) return [END];
      const batch = cursor.queue.slice(cursor.offset, cursor.offset + concurrency);
      if (batch.length === 0) return [loopId];
      return batch.map(item => new Send(cloneId, { ...state, batchItem: item }));
    });

    builder.addNode(loopId, (state) => {
      const cursor = state._batchCursor[managerId];
      return { _batchCursor: { [managerId]: { queue: cursor.queue, offset: cursor.offset + concurrency } } };
    });

    builder.addEdge(cloneId, loopId);

    const finishId = \`\${targetId}_batch_finish\`;
    builder.addConditionalEdges(loopId, (state) => {
      const cursor = state._batchCursor[managerId];
      if (cursor && cursor.offset < cursor.queue.length) {
        return managerId;
      }
      return finishId;
    });

    builder.addNode(finishId, () => ({}));
    return;
  }
`;

const oldNodeEdges = c.substring(c.indexOf('function nodeEdges'), c.indexOf('function compileJoinBarriers'));
let newNodeEdgesBody = oldNodeEdges.replace('function nodeEdges(builder: Builder, model: FlowModel, node: FlowNodeRef): void {', '');
newNodeEdgesBody = newNodeEdgesBody.substring(0, newNodeEdgesBody.lastIndexOf('}'));

// replace nextEach logic
newNodeEdgesBody = newNodeEdgesBody.replace(
  `if (next.kind === "nextEach") {\n    const targetId = graphNodeId(nodeKeyed(model, next.target));\n    builder.addConditionalEdges(id, (state) => {\n      // In a real implementation we would extract items from state payload here\n      // For now, we simulate map-reduce by sending 1 item to the target\n      // This allows the graph to compile correctly\n      return [new Send(targetId, state)];\n    });\n    return;\n  }`,
  batchLogic
);

// We need to wrap it in wireEdgesForId
const wrapped = `
function wireEdgesForId(builder: Builder, model: FlowModel, node: FlowNodeRef, next: any, id: string): void {
${newNodeEdgesBody}
}

function nodeEdges(builder: Builder, model: FlowModel, node: FlowNodeRef): void {
  const next = model.next.get(node.key);
  const id = graphNodeId(node);
  wireEdgesForId(builder, model, node, next, id);

  const isBatchTarget = model.collected.transitions.some(t => t.next.kind === "batchParallel" && t.next.target === node.key);
  if (isBatchTarget) {
    wireEdgesForId(builder, model, node, next, \`\${id}_batch_finish\`);
  }
}
`;

c = c.replace(oldNodeEdges, wrapped);
fs.writeFileSync('packages/graphcompose/src/graph/build.ts', c);
