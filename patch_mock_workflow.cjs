const fs = require('fs');
const file = 'packages/graphcompose/src/testing/test-with.ts';
let code = fs.readFileSync(file, 'utf-8');

if (!code.includes('mockSubworkflow:')) {
  code = code.replace(
    /readonly mockOf: <T>\(component: Class<T>\) => Mocked<T>;/,
    'readonly mockOf: <T>(component: Class<T>) => Mocked<T>;\n  /** Mocks a nested workflow to prevent it from executing its subgraph. */\n  readonly mockSubworkflow: (workflow: Class) => import("vitest").Mock;'
  );

  code = code.replace(
    /mockOf: environment\.mockOf\.bind\(environment\),/,
    'mockOf: environment.mockOf.bind(environment),\n    mockSubworkflow: environment.mockSubworkflow.bind(environment),'
  );

  fs.writeFileSync(file, code);
}
