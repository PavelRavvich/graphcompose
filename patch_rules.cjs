const fs = require('fs');
const file = 'packages/graphcompose/src/graph/rules.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/\.filter\(\(\[, steps\]\) => steps\.length > 1\)/, '.filter(([, steps]) => steps.filter(s => s.next.kind !== "catch").length > 1)');

// Also we need to add "catch" to targetsOf
code = code.replace(/    case "join":\n      return \[transition\.next\.target\];/, '    case "join":\n    case "catch":\n      return [transition.next.target];');

fs.writeFileSync(file, code);
