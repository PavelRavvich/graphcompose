const fs = require('fs');

function patch(file, regex, rep) {
  let code = fs.readFileSync(file, 'utf-8');
  code = code.replace(regex, rep);
  fs.writeFileSync(file, code);
}

patch('packages/graphcompose/src/testing/slices.ts', /_batchCursor: \{\},/, '_batchCursor: {},\n  lastError: null,');
patch('packages/graphcompose/src/graph/agent-loop/runner.ts', /_batchCursor: \{\},/, '_batchCursor: {},\n    lastError: null,');
