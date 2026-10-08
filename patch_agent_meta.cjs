const fs = require('fs');
const file = 'packages/graphcompose/src/components/meta-types.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/readonly name: string;\n/, 'readonly name: string;\n  /** The compensating agent class for SAGA rollbacks */\n  readonly compensate?: Class;\n');
fs.writeFileSync(file, code);
