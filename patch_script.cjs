const fs = require("fs");
const file = "packages/graphcompose/src/testing/script-book.ts";
let code = fs.readFileSync(file, "utf-8");

if (!code.includes("handle(handler")) {
  code = code.replace(
    /thenAlways\(turn: ScriptedTurn\): ModelScript;/,
    "thenAlways(turn: ScriptedTurn): ModelScript;\n  /** A dynamic closure to handle requests. Overrides respond/thenAlways if set. */\n  handle(handler: (req: ModelRequest) => ScriptedTurn | Promise<ScriptedTurn>): ModelScript;",
  );

  code = code.replace(
    /#always: ScriptedTurn \| undefined;/,
    "#always: ScriptedTurn | undefined;\n  #handler: ((req: ModelRequest) => ScriptedTurn | Promise<ScriptedTurn>) | undefined;",
  );

  code = code.replace(
    /thenAlways\(turn: ScriptedTurn\): this \{/,
    "handle(handler: (req: ModelRequest) => ScriptedTurn | Promise<ScriptedTurn>): this {\n    this.#handler = handler;\n    return this;\n  }\n\n  thenAlways(turn: ScriptedTurn): this {",
  );

  code = code.replace(
    /get isScripted\(\): boolean \{/,
    "get isScripted(): boolean {\n    return this.#handler !== undefined || this.#turns.length > 0 || this.#always !== undefined;",
  );

  // Now modify the `next(req)` method which returns a promise in ComponentScript.
  code = code.replace(
    /async next\(req: ModelRequest\): Promise<ScriptedTurn> \{/,
    "async next(req: ModelRequest): Promise<ScriptedTurn> {\n    if (this.#handler !== undefined) {\n      this.requests.push(req);\n      return this.#handler(req);\n    }",
  );

  // We need to check if we missed `isScripted` replacement.
  code = code.replace(
    /get isScripted\(\): boolean \{\n    return this\.#turns\.length > 0 \|\| this\.#always !== undefined;/,
    "get isScripted(): boolean {\n    return this.#handler !== undefined || this.#turns.length > 0 || this.#always !== undefined;",
  );

  fs.writeFileSync(file, code);
}
