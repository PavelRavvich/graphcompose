const fs = require("fs");
const path = "packages/graphcompose/src/graph/flow-runners.ts";
let code = fs.readFileSync(path, "utf8");

const replacement = `
      case "action": {
        if (!deps.actions) throw new Error("Workflow actions not wired in RunDeps");
        const action = deps.actions(node.name);
        if (!action) throw new UnknownActionError(\`Unknown action: \${node.name}\`);
        return async (state, config) => {
          const runId = config?.configurable?.runId ?? "";
          
          const getComponentClass = (nodeName: string) => {
            const collected = collectFlow(deps.flow);
            return collected.nodes.get(nodeName)?.use;
          };

          const runCompensation = async (compClass: Class, childState: any) => {
            const comp = componentOf(compClass);
            if (!comp) throw new Error(\`Component not found for compensation class\`);
            
            if (comp.kind === "action") {
               if (!deps.actions) throw new Error("Actions not wired");
               const act = deps.actions(comp.meta.name);
               const ctx = { runId, signal: config?.signal, getComponentClass, runCompensation };
               return await act.execute(childState, ctx);
            }
            if (comp.kind === "agent") {
               const loop = loops.get(comp.meta.name);
               if (!loop) throw new Error(\`Agent loop not found for \${comp.meta.name}\`);
               const runner = agentRunner(loop, comp.meta.name);
               return await runner(childState, config);
            }
            if (comp.kind === "workflow") {
               const { flowGraphOf } = await import("./flow-runtime.js");
               const flowReal = await flowGraphOf(deps, run);
               return await flowReal.graph.invoke(childState, { configurable: { runId, thread_id: runId } });
            }
            throw new Error(\`Unsupported compensation kind: \${comp.kind}\`);
          };

          const context = { 
            runId, 
            signal: config?.signal,
            getComponentClass,
            runCompensation
          };

          const appState = { runId, activeNode: node.name };
          await deps.observer?.onActionStart({ name: node.name, input: state, state: appState });
          const result = await action.execute(state, context);
          await deps.observer?.onActionEnd({ name: node.name, update: result, state: appState });
          return result;
        };
      }
`;

code = code.replace(
  /case "action": \{[\s\S]*?(?=case "workflow": \{)/,
  replacement.trim() + "\n      ",
);
fs.writeFileSync(path, code);
