const fs = require('fs');
const file = 'packages/graphcompose/src/testing/script-book.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(
  /    if \(this\.#handler !== undefined\) return this\.#handler\(req\);\n/g,
  ''
);

fs.writeFileSync(file, code);
