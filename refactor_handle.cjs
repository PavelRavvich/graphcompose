const fs = require('fs');

const bookFile = 'packages/graphcompose/src/testing/script-book.ts';
let bookCode = fs.readFileSync(bookFile, 'utf-8');

// Ensure ModelScript has handle()
if (!bookCode.includes('handle(handler')) {
  bookCode = bookCode.replace(
    /thenAlways\(turn: ScriptedTurn\): ModelScript;/,
    'thenAlways(turn: ScriptedTurn): ModelScript;\n  /** A dynamic closure to handle requests. Overrides respond/thenAlways if set. */\n  handle(handler: (req: ModelRequest) => ScriptedTurn | Promise<ScriptedTurn>): ModelScript;'
  );
}
// Fix ComponentScript fields
if (!bookCode.includes('#handler:')) {
  bookCode = bookCode.replace(
    /#always: ScriptedTurn \| undefined;/,
    '#always: ScriptedTurn | undefined;\n  #handler: ((req: ModelRequest) => ScriptedTurn | Promise<ScriptedTurn>) | undefined;'
  );
}
// Add handle method
if (!bookCode.includes('handle(handler: (req: ModelRequest)')) {
  bookCode = bookCode.replace(
    /thenAlways\(turn: ScriptedTurn\): this \{/,
    'handle(handler: (req: ModelRequest) => ScriptedTurn | Promise<ScriptedTurn>): this {\n    this.#handler = handler;\n    return this;\n  }\n\n  thenAlways(turn: ScriptedTurn): this {'
  );
}
// Fix isScripted
bookCode = bookCode.replace(
  /get isScripted\(\): boolean \{\n    return this.#turns.length > 0 \|\| this.#always !== undefined;\n  \}/,
  'get isScripted(): boolean {\n    return this.#handler !== undefined || this.#turns.length > 0 || this.#always !== undefined;\n  }'
);
// In case my bad patch messed up isScripted with double returns:
bookCode = bookCode.replace(
  /return this.#handler !== undefined \|\| this.#turns.length > 0 \|\| this.#always !== undefined;\n    return this.#turns.length > 0 \|\| this.#always !== undefined;/,
  'return this.#handler !== undefined || this.#turns.length > 0 || this.#always !== undefined;'
);

// Fix next()
bookCode = bookCode.replace(
  /next\(\): ScriptedTurn \{/,
  'async next(req: ModelRequest): Promise<ScriptedTurn> {\n    if (this.#handler !== undefined) return this.#handler(req);'
);

fs.writeFileSync(bookFile, bookCode);
console.log("Patched script-book.ts");
