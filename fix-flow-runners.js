import fs from "fs";

let content = fs.readFileSync("packages/graphcompose/src/graph/flow-runners.ts", "utf-8");

// Add import for WorkflowCancelledError
content = content.replace(
  'import { NotPausedError } from "../pause/index.js";',
  'import { NotPausedError } from "../pause/index.js";\nimport { WorkflowCancelledError } from "../core/errors.js";',
);

// Add guard to action runner (line 108 approx)
content = content.replace(
  /return async \(state, config\) => {\n\s+const runId = config\?.configurable\?.runId \?\? "";/,
  'return async (state, config) => {\n          if (state.cancelRequested) {\n            throw new WorkflowCancelledError();\n          }\n          const runId = config?.configurable?.runId ?? "";',
);

// Add idempotencyKey to action context
content = content.replace(
  "runId,\n            signal: config?.signal,\n            getComponentClass,\n            runCompensation,\n            executionContext: config?.configurable?.executionContext,",
  "runId,\n            idempotencyKey: `run_${runId}_node_${node.name}`,\n            signal: config?.signal,\n            getComponentClass,\n            runCompensation,\n            executionContext: config?.configurable?.executionContext,",
);

// Add guard to workflow runner (line 162 approx)
content = content.replace(
  /return async \(state, config\) => {\n\s+const runId = state\.runId;/,
  "return async (state, config) => {\n          if (state.cancelRequested) {\n            throw new WorkflowCancelledError();\n          }\n          const runId = state.runId;",
);

// Add guard to agent runner (line 224 approx)
content = content.replace(
  /return async \(state, config\) => {\n\s+const runId = state\.runId;\n\s+const appState = { runId, activeNode: node\.name, variables: {}, history: state\.history };/,
  "return async (state, config) => {\n          if (state.cancelRequested) {\n            throw new WorkflowCancelledError();\n          }\n          const runId = state.runId;\n          const appState = { runId, activeNode: node.name, variables: {}, history: state.history };",
);

fs.writeFileSync("packages/graphcompose/src/graph/flow-runners.ts", content);
