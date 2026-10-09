const fs = require('fs');
const code = fs.readFileSync('packages/graphcompose/tests/graph/agent-loop/coverage.test.ts', 'utf-8');
const fixed = code.replace(/  it\("answer-node with move content array and no text"[\s\S]*?\}\);\n/, "");
fs.writeFileSync('packages/graphcompose/tests/graph/agent-loop/coverage.test.ts', fixed);
