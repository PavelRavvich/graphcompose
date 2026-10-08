const fs = require('fs');
const file = 'packages/graphcompose/tests/graph/saga.test.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/import \{ testWith \} from "\.\.\/helpers\.js";/, 'import { testWith } from "../../src/testing/test-with.js";');

fs.writeFileSync(file, code);
