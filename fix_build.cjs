const fs = require('fs');
const file = 'packages/graphcompose/src/graph/build.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/if \(catchNode\.errorType === "any" \|\| state\.lastError\.name === catchNode\.errorType\.name\) \{/, 'if (catchNode.errorType === "any" || (typeof catchNode.errorType !== "string" && state.lastError.name === catchNode.errorType.name)) {');

fs.writeFileSync(file, code);
