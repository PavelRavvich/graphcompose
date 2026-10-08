const fs = require("fs");
const path = "packages/graphcompose/src/graph/build.ts";
let code = fs.readFileSync(path, "utf8");

if (!code.includes("import { componentOf }")) {
  code = code.replace(
    'import { END, START, Send, StateGraph } from "@langchain/langgraph";',
    'import { END, START, Send, StateGraph } from "@langchain/langgraph";\nimport { componentOf } from "../components/metadata.js";',
  );
}

// Patch nodeEdges
const oldNodeEdges = `  } else if (next.kind === "join" || next.kind === "mapEach") {
    builder.addEdge(id, graphNodeId(nodeKeyed(model, next.target)));
  }`;
const newNodeEdges = `  } else if (next.kind === "join") {
    builder.addEdge(id, graphNodeId(nodeKeyed(model, next.target)));
  } else if (next.kind === "mapEach") {
    builder.addEdge(id, \`__mapeach_\${node.key}_to_\${next.target}\`);
  }`;
code = code.replace(oldNodeEdges, newNodeEdges);

// Add compileMapEachLoops
const loopsCode = `
function compileMapEachLoops(builder: Builder, model: FlowModel, deps: any) {
  const mapEachTransitions = model.collected.transitions.filter((t) => t.next && t.next.kind === "mapEach");
  
  for (const t of mapEachTransitions) {
      if (!t.next || t.next.kind !== "mapEach") continue;
      
      const next = t.next;
      const sourceNodeKey = t.from;
      const targetNodeKey = next.target;
      const targetNode = nodeKeyed(model, targetNodeKey);
      
      const loopNodeId = \`__mapeach_\${sourceNodeKey}_to_\${targetNodeKey}\`;
      const targetCloneId = \`\${graphNodeId(targetNode)}_batch_clone\`;
      
      builder.addNode(loopNodeId, async (state: any) => {
          let queue = state._batchCursor?.[targetNodeKey]?.queue;
          if (queue === undefined) {
              const strategy = deps.container.get(next.strategy);
              queue = await strategy.extract(state);
          }
          
          const limit = next.options.concurrencyLimit;
          const activeBatch = queue.slice(0, limit);
          const newQueue = queue.slice(limit);
          
          return {
              _batchCursor: {
                  [targetNodeKey]: { queue: newQueue, activeBatch }
              }
          };
      });
      
      builder.addConditionalEdges(loopNodeId, (state: any) => {
          const activeBatch = state._batchCursor[targetNodeKey].activeBatch;
          
          if (!activeBatch || activeBatch.length === 0) {
              const outgoing = model.collected.transitions.find(tr => tr.from === targetNodeKey);
              if (!outgoing || !outgoing.next) return END;
              if (outgoing.next.kind === "to") return graphNodeId(nodeKeyed(model, outgoing.next.targets[0]));
              if (outgoing.next.kind === "join") return graphNodeId(nodeKeyed(model, outgoing.next.target));
              return END;
          }
          
          return activeBatch.map((item: any) => new Send(targetCloneId, { batchItem: item }));
      });
      
      builder.addEdge(targetCloneId, loopNodeId);
  }
}
`;
if (!code.includes("compileMapEachLoops(builder, model, sharedDeps)")) {
  code = code.replace(
    "compileJoinBarriers(builder, model);",
    "compileJoinBarriers(builder, model);\n  compileMapEachLoops(builder, model, sharedDeps);",
  );
  code = code + loopsCode;
}

fs.writeFileSync(path, code);
