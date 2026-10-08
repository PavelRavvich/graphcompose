const fs = require('fs');
const file = 'packages/graphcompose/src/testing/test-with.ts';
let code = fs.readFileSync(file, 'utf-8');

if (!code.includes('mockWorkflow: environment.mockWorkflow.bind(environment),')) {
  code = code.replace(
    /mockOf: environment\.mockOf\.bind\(environment\),/,
    'mockOf: environment.mockOf.bind(environment),\n    mockWorkflow: environment.mockWorkflow.bind(environment),'
  );
  fs.writeFileSync(file, code);
}
