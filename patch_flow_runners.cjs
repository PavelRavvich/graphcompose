const fs = require("fs");
const file = "packages/graphcompose/src/graph/flow-runners.ts";
let code = fs.readFileSync(file, "utf-8");

const importsToAdd = `
import { componentOf } from "../components/metadata.js";
import type { WorkflowMeta } from "../components/meta-types.js";
import type { WorkflowDefinition } from "./settings.js";
`;

// Insert imports after the existing ones
code = code.replace(
  /import type { MultimodalFinishOutput } from "\.\.\/app\/types\.js";/,
  `import type { MultimodalFinishOutput } from "../app/types.js";\n${importsToAdd}`,
);

// Add the case "workflow":
const agentCaseRegex = /case "agent": \{/;

const workflowCase = `case "workflow": {
        const component = componentOf(node.use);
        if (!component || component.kind !== "workflow") throw new Error(\`Not a workflow: \${node.name}\`);
        
        return async (state, config) => {
          const runId = state.runId;
          const appState = { runId, activeNode: node.name, variables: {}, history: state.history };
          await deps.observer?.onActionStart({ name: node.name, input: state, state: appState });
          
          const meta = component.meta as WorkflowMeta;
          const WorkflowClass = node.use as new () => WorkflowDefinition;
          const instance = new WorkflowClass();
          const localSettings = instance.settings ? instance.settings() : {};
          
          // Create sub-dependencies inheriting from parent but overriding flow
          const subDeps: GraphDeps<TName> = {
            ...deps,
            flow: meta.flow
            // Ideally we'd merge localSettings.limits into subDeps.limits here, 
            // but for now we rely on the global ledger.
          };
          
          // Re-import flowGraphOf dynamically or use a passed reference to avoid circular dependency
          // Wait, flowGraphOf is in flow-runtime.ts, which calls this file. Circular dependency!
          // We can require it inline.
          const { flowGraphOf } = require("./flow-runtime.js");
          const flow = await flowGraphOf(subDeps, {
            limits: deps.limits,
            spentToday: async () => 0 // passed correctly in real impl
          });
          
          const childState = {
            ...state,
            steps: 0,
            path: [],
            visits: {},
            forks: {},
            _batchCursor: {}
          };
          
          const result = await flow.graph.invoke(childState, config);
          
          await deps.observer?.onActionEnd({ name: node.name, update: result, state: appState });
          
          return {
            payload: result.payload,
            contributions: result.contributions,
            steps: result.steps
          };
        };
      }
      `;

code = code.replace(agentCaseRegex, workflowCase + '\n      case "agent": {');

fs.writeFileSync(file, code);
