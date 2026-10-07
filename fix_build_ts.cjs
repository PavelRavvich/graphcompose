const fs = require('fs');
let c = fs.readFileSync('packages/graphcompose/src/graph/build.ts', 'utf8');

c = c.replace(/const next = model\.next\.get\(node\.key\);\n  const id = graphNodeId\(node\);\n/g, '');
c = c.replace(/const targets = next\.targets\.map\(\(t\) => graphNodeId\(nodeKeyed\(model, t\)\)\);/g, 'const targets = next.targets.map((t: any) => graphNodeId(nodeKeyed(model, t)));');
c = c.replace(/queue: cursor\.queue, offset: cursor\.offset/g, 'queue: cursor!.queue, offset: cursor!.offset');

fs.writeFileSync('packages/graphcompose/src/graph/build.ts', c);
