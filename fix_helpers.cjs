const fs = require('fs');
const file = 'packages/graphcompose/tests/helpers.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/_batchCursor: \{\},/, '_batchCursor: {},\n    lastError: null,');

fs.writeFileSync(file, code);
