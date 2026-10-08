const fs = require('fs');
const file = 'packages/graphcompose/src/testing/test-with.ts';
let code = fs.readFileSync(file, 'utf-8');

if (!code.includes('mockSubworkflow: environment.mockSubworkflow.bind(environment),')) {
  code = code.replace(
    /mockOf: environment\.mockOf\.bind\(environment\),/,
    'mockOf: environment.mockOf.bind(environment),\n    mockSubworkflow: environment.mockSubworkflow.bind(environment),'
  );
  fs.writeFileSync(file, code);
}
