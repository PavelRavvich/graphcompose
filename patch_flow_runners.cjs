const fs = require('fs');
const file = 'packages/graphcompose/src/graph/flow-runners.ts';
let code = fs.readFileSync(file, 'utf-8');

if (!code.includes('const mock = deps.mockedWorkflows?.get(node.use);')) {
  code = code.replace(
    /const WorkflowClass = node\.use as new \(\) => WorkflowDefinition;/,
    'const WorkflowClass = node.use as new () => WorkflowDefinition;\n          const mock = deps.mockedWorkflows?.get(node.use);\n          if (mock) {\n            const mockResult = await mock(state, config);\n            await deps.observer?.onActionEnd({ name: node.name, update: mockResult || {}, state: appState });\n            return mockResult || {};\n          }'
  );

  fs.writeFileSync(file, code);
}
