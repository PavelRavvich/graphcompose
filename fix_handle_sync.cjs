const fs = require('fs');
const bookFile = 'packages/graphcompose/src/testing/script-book.ts';
let code = fs.readFileSync(bookFile, 'utf-8');

code = code.replace(
  /thenAlways\(turn: ScriptedTurn\): ModelScript;/,
  'thenAlways(turn: ScriptedTurn): ModelScript;\n  /** A dynamic closure to handle requests. Overrides respond/thenAlways if set. */\n  handle(handler: (req: ModelRequest) => ScriptedTurn): ModelScript;'
);

code = code.replace(
  /#always: ScriptedTurn \| undefined;/,
  '#always: ScriptedTurn | undefined;\n  #handler: ((req: ModelRequest) => ScriptedTurn) | undefined;'
);

code = code.replace(
  /thenAlways\(turn: ScriptedTurn\): this \{/,
  'handle(handler: (req: ModelRequest) => ScriptedTurn): this {\n    this.#handler = handler;\n    return this;\n  }\n\n  thenAlways(turn: ScriptedTurn): this {'
);

code = code.replace(
  /get isScripted\(\): boolean \{\n    return this.#turns.length > 0 \|\| this.#always !== undefined;\n  \}/,
  'get isScripted(): boolean {\n    return this.#handler !== undefined || this.#turns.length > 0 || this.#always !== undefined;\n  }'
);

code = code.replace(
  /next\(\): ScriptedTurn \{/,
  'next(req: ModelRequest): ScriptedTurn {\n    if (this.#handler !== undefined) return this.#handler(req);'
);

fs.writeFileSync(bookFile, code);

// Now update the callers to pass `req` to `next(req)`!
const chatFile = 'packages/graphcompose/src/testing/scripted-chat-model.ts';
let chatCode = fs.readFileSync(chatFile, 'utf-8');
chatCode = chatCode.replace(
  /script\.requests\.push\(chatRequestOf\(messages\)\);\n    try \{\n      const message = replyOf\(script\.next\(\), script, this\.book, this\.settings\);/,
  'const req = chatRequestOf(messages);\n    script.requests.push(req);\n    try {\n      const message = replyOf(script.next(req), script, this.book, this.settings);'
);
fs.writeFileSync(chatFile, chatCode);

const gatewayFile = 'packages/graphcompose/src/testing/scripted-gateway.ts';
let gatewayCode = fs.readFileSync(gatewayFile, 'utf-8');
gatewayCode = gatewayCode.replace(
  /script\.requests\.push\(\{\n        kind: "decision",\n        input: spec\.request\.input,\n        options: spec\.request\.options\.map\(\(option\) => option\.name\),\n        instructions: spec\.request\.instructions \?\? "",\n      \}\);\n      if \(\!script\.isScripted && spec\.router\.startsWith\("guard:"\)\) \{\n        return Promise\.resolve\(GUARD_PASSES\);\n      \}\n      try \{\n        return Promise\.resolve\(outcomeOf\(script\.next\(\), spec, script\)\);/,
  `const req: ModelRequest = {
        kind: "decision",
        input: spec.request.input,
        options: spec.request.options.map((option) => option.name),
        instructions: spec.request.instructions ?? "",
      };
      script.requests.push(req);
      if (!script.isScripted && spec.router.startsWith("guard:")) {
        return Promise.resolve(GUARD_PASSES);
      }
      try {
        return Promise.resolve(outcomeOf(script.next(req), spec, script));`
);
fs.writeFileSync(gatewayFile, gatewayCode);

console.log("Synchronous handle implemented");
