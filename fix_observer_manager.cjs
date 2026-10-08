const fs = require('fs');
const file = 'packages/graphcompose/src/core/observer-manager.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/async onWorkflowEnd\(result: any, state: AppState\)/, 'async onWorkflowEnd(result: unknown, state: AppState)');

fs.writeFileSync(file, code);
