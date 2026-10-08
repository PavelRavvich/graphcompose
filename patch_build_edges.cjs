const fs = require("fs");
const file = "packages/graphcompose/src/graph/build.ts";
let code = fs.readFileSync(file, "utf-8");

const wireEdgesRegex = /function wireEdgesForId\([\s\S]*?^  \}\n\}/m;

const replacement = `function wireEdgesForId(
  builder: Builder,
  model: FlowModel,
  node: FlowNodeRef,
  next: any,
  id: string,
  deps: any,
): void {
  const catches = model.catches.get(node.key) || [];
  
  if (catches.length > 0) {
    // If we have catch blocks, we MUST use conditional edges
    builder.addConditionalEdges(id, (state: any) => {
      if (state.lastError) {
        for (const catchNode of catches) {
          if (catchNode.errorType === "any" || state.lastError.name === catchNode.errorType.name) {
             return graphNodeId(nodeKeyed(model, catchNode.nextNode));
          }
        }
        // Unhandled error
        throw state.lastError;
      }
      
      // Happy path
      if (node.kind === "workflow-finish" || (next === undefined && node.kind !== "agent")) {
        return END;
      }
      if (!next) return END; // Agent without next implies END? wait, no.
      
      if (next.kind === "to") {
         const targets = next.targets.map((t: any) => graphNodeId(nodeKeyed(model, t)));
         return targets;
      }
      if (next.kind === "choose") {
         return state.route;
      }
      if (next.kind === "join" || next.kind === "batchParallel") {
         return graphNodeId(nodeKeyed(model, next.target));
      }
      return END;
    });
    return;
  }

  // Original fast-path wiring
  if (node.kind === "workflow-finish" || (next === undefined && node.kind !== "agent")) {
    builder.addEdge(id, END);
    return;
  }
  if (!next) return;
  if (next.kind === "to") {
    const targets = next.targets.map((t: any) => graphNodeId(nodeKeyed(model, t)));
    if (node.kind === "workflow-start") {
      const singleTarget = targets.length === 1 && targets[0] !== undefined;
      builder.addConditionalEdges(
        id,
        singleTarget
          ? (state) => (state.optionalBranches?.includes(node.key) ? "__skip__" : targets[0])
          : (state) => (state.optionalBranches?.includes(node.key) ? ["__skip__"] : targets),
      );
    } else {
      for (const t of targets) builder.addEdge(id, t);
    }
  } else if (next.kind === "choose") {
    builder.addConditionalEdges(id, (state) => state.route);
  } else if (next.kind === "join" || next.kind === "batchParallel") {
    builder.addEdge(id, graphNodeId(nodeKeyed(model, next.target)));
  }
}`;

code = code.replace(wireEdgesRegex, replacement);

fs.writeFileSync(file, code);
