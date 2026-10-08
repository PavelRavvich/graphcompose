const fs = require('fs');
const file = 'packages/graphcompose/tests/core/observability-tails.test.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/expect\(hookEvents\)\.toContain\("ActionStart:FormatAction"\);/, 'console.log("HOOK EVENTS:", hookEvents);\n    expect(hookEvents).toContain("ActionStart:FormatAction");');

fs.writeFileSync(file, code);
