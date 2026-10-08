const fs = require('fs');
const file = 'packages/graphcompose/tests/graph/saga.test.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/import \{ WorkflowStart, WorkflowFinish, catchError, from \} from "\.\.\/\.\.\/src\/index\.js";\nimport \{ Agent, Workflow \} from "\.\.\/\.\.\/src\/components\/decorators\.js";/, 
`import { Agent, Workflow } from "../../src/components/decorators.js";
import { from, catchError } from "../../src/router/index.js";
import { WorkflowStart, WorkflowFinish } from "../../src/core/index.js";`);

fs.writeFileSync(file, code);
