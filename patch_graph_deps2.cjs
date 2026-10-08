const fs = require('fs');
const file = 'packages/graphcompose/src/graph/deps.ts';
let code = fs.readFileSync(file, 'utf-8');

if (!code.includes('mockedWorkflows?')) {
  code = code.replace(
    /readonly quorumRouters\?: \([^]*?QuorumStrategy;/,
    `$&
  readonly mockedWorkflows?: ReadonlyMap<import("../components/injection.js").Class, (...args: any[]) => any>;`
  );
  fs.writeFileSync(file, code);
}
