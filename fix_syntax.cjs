const fs = require('fs');

const bookFile = 'packages/graphcompose/src/testing/script-book.ts';
let code = fs.readFileSync(bookFile, 'utf-8');

const regex = /async handleRequest\(req: ModelRequest\): Promise<ScriptedTurn> \{[\s\S]*?return turn;\n  \}/;

code = code.replace(regex, `async handleRequest(req: ModelRequest): Promise<ScriptedTurn> {
    if (this.#handler !== undefined) return this.#handler(req);
    return this.next();
  }

  next(): ScriptedTurn {
    if (!this.isScripted) {
      throw new LiveCallBlockedError(
        \`\${this.label} has no script — a live model call is blocked in tests; script it with modelOf(\${this.label}).respond(…)\`
      );
    }
    const turn = this.#turns[this.#position] ?? this.#always;
    this.#position += 1;
    if (turn === undefined) {
      throw new TestFailure(
        "test.script-exhausted",
        \`script exhausted for \${this.label}: \${plural(this.#turns.length, "turn")} scripted, asked for #\${String(this.#position)} — add turns or end with .thenAlways(…)\`
      );
    }
    return turn;
  }`);

fs.writeFileSync(bookFile, code);
console.log("Syntax fixed");
