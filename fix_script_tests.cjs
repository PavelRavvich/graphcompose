const fs = require('fs');

const bookFile = 'packages/graphcompose/src/testing/script-book.ts';
let bookCode = fs.readFileSync(bookFile, 'utf-8');

// Restore next() to original
bookCode = bookCode.replace(
  /async next\(req: ModelRequest\): Promise<ScriptedTurn> \{\n    if \(this\.#handler !== undefined\) return this\.#handler\(req\);/,
  'next(): ScriptedTurn {\n    if (!this.isScripted) {\n      throw new LiveCallBlockedError(\n        `${this.label} has no script — a live model call is blocked in tests; script it with modelOf(${this.label}).respond(…)`\n      );\n    }\n    const turn = this.#turns[this.#position] ?? this.#always;\n    this.#position += 1;\n    if (turn === undefined) {\n      throw new TestFailure(\n        "test.script-exhausted",\n        `script exhausted for ${this.label}: ${plural(this.#turns.length, "turn")} scripted, asked for #${String(this.#position)} — add turns or end with .thenAlways(…)`\n      );\n    }\n    return turn;'
);

// Add handleRequest
bookCode = bookCode.replace(
  /next\(\): ScriptedTurn \{/,
  'async handleRequest(req: ModelRequest): Promise<ScriptedTurn> {\n    if (this.#handler !== undefined) return this.#handler(req);\n    return this.next();\n  }\n\n  next(): ScriptedTurn {'
);

fs.writeFileSync(bookFile, bookCode);


const chatFile = 'packages/graphcompose/src/testing/scripted-chat-model.ts';
let chatCode = fs.readFileSync(chatFile, 'utf-8');

chatCode = chatCode.replace(
  /const req = chatRequestOf\(messages\);\n    script\.requests\.push\(req\);\n    try \{\n      const message = replyOf\(await script\.next\(req\), script, this\.book, this\.settings\);/,
  'const req = chatRequestOf(messages);\n    script.requests.push(req);\n    try {\n      const message = replyOf(await script.handleRequest(req), script, this.book, this.settings);'
);
fs.writeFileSync(chatFile, chatCode);

const gatewayFile = 'packages/graphcompose/src/testing/scripted-gateway.ts';
let gatewayCode = fs.readFileSync(gatewayFile, 'utf-8');

gatewayCode = gatewayCode.replace(
  /const turn = await script\.next\(req\);/,
  'const turn = await script.handleRequest(req);'
);
fs.writeFileSync(gatewayFile, gatewayCode);

console.log("Restored backwards compatibility");
