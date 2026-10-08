const fs = require('fs');
const file = 'packages/graphcompose/src/testing/environment.ts';
let code = fs.readFileSync(file, 'utf-8');

if (!code.includes('import { vi } from "vitest";')) {
  code = code.replace(
    /import { nodeNameOf } from "\.\/failure-facts\.js";/,
    'import { nodeNameOf } from "./failure-facts.js";\nimport { vi } from "vitest";'
  );
  code = code.replace(/const { vi } = require\("vitest"\);/, '');
  fs.writeFileSync(file, code);
}
