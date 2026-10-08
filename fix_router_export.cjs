const fs = require('fs');
const file = 'packages/graphcompose/src/router/index.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/from,\n  chain,/, 'from,\n  chain,\n  catchError,');

fs.writeFileSync(file, code);
