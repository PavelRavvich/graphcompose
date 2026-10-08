const fs = require('fs');

const file = 'packages/graphcompose/src/testing/scripted-chat-model.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(
  /script\.requests\.push\(chatRequestOf\(messages\)\);\n    try \{\n      const req = chatRequestOf\(messages\);\n      const message = replyOf\(await script\.next\(req\), script, this\.book, this\.settings\);/,
  'const req = chatRequestOf(messages);\n    script.requests.push(req);\n    try {\n      const message = replyOf(await script.handleRequest(req), script, this.book, this.settings);'
);

// We should also replace Promise.resolve and Promise.reject because it's async now!
code = code.replace(/return Promise\.resolve\(\{ generations: \[\{ text: message.text, message \}\] \}\);/, 'return { generations: [{ text: message.text, message }] };');
code = code.replace(/return Promise\.reject\(asError\(error\)\);/, 'throw asError(error);');

fs.writeFileSync(file, code);
