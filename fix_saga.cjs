const fs = require('fs');
const file = 'packages/graphcompose/src/core/saga.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/import type \{ AgentState \} from "\.\.\/graph\/state\.js";/, 'import type { FlowStateType } from "../graph/visit.js";');
code = code.replace(/AgentState/, 'FlowStateType');

fs.writeFileSync(file, code);
