const fs = require('fs');
const file = 'packages/graphcompose/src/components/assemble.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/services\.resolve\(cls\)/g, 'containerFor(bundle, services).get(cls)');
code = code.replace(/services\.resolve\(c\)/g, 'containerFor(bundle, services).get(c)');

fs.writeFileSync(file, code);
