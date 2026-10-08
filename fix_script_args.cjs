const fs = require('fs');
const file = 'packages/graphcompose/src/testing/script-book.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(
  /next\(req: ModelRequest\): ScriptedTurn \{/,
  'next(req?: ModelRequest): ScriptedTurn {\n    if (this.#handler !== undefined) {\n      if (!req) throw new Error("ModelRequest is required when using .handle()");\n      return this.#handler(req);\n    }'
);
// wait, the previous code was:
// next(req: ModelRequest): ScriptedTurn {
//   if (this.#handler !== undefined) return this.#handler(req);

code = code.replace(
  /next\(req: ModelRequest\): ScriptedTurn \{\n    if \(this\.#handler !== undefined\) return this\.#handler\(req\);/,
  'next(req?: ModelRequest): ScriptedTurn {\n    if (this.#handler !== undefined) {\n      if (!req) throw new Error("ModelRequest is required when using .handle()");\n      return this.#handler(req);\n    }'
);

fs.writeFileSync(file, code);
