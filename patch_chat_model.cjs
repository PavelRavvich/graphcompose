const fs = require("fs");

const chatFile = "packages/graphcompose/src/testing/scripted-chat-model.ts";
let chatCode = fs.readFileSync(chatFile, "utf-8");

chatCode = chatCode.replace(
  /const message = replyOf\(script\.next\(\), script, this\.book, this\.settings\);/,
  "const req = chatRequestOf(messages);\n      const message = replyOf(await script.next(req), script, this.book, this.settings);",
);

// We need to remove the push because script.next(req) now handles... Wait, script-book's `next(req)` doesn't push! `script.requests.push()` is currently done before `script.next()`. Let's see:
// The original code was:
// script.requests.push(chatRequestOf(messages));
// const message = replyOf(script.next(), script, this.book, this.settings);

// So if I do:
// const req = chatRequestOf(messages);
// const message = replyOf(await script.next(req), script, this.book, this.settings);
// I should remove the duplicated `script.requests.push()`.

// Wait, original:
// script.requests.push(chatRequestOf(messages));
// try {
//   const message = replyOf(script.next(), script, this.book, this.settings);

chatCode = chatCode.replace(
  /script\.requests\.push\(chatRequestOf\(messages\)\);\n    try \{\n      const message = replyOf\(script\.next\(\), script, this\.book, this\.settings\);/,
  "const req = chatRequestOf(messages);\n    script.requests.push(req);\n    try {\n      const message = replyOf(await script.next(req), script, this.book, this.settings);",
);

// We also need to change `_generate` signature if needed, but it's already `Promise<ChatResult>`.
// Wait, `_generate` is synchronous returning Promise, we should make it `async _generate`!
chatCode = chatCode.replace(
  /_generate\(messages: BaseMessage\[\]\): Promise<ChatResult> \{/,
  "async _generate(messages: BaseMessage[]): Promise<ChatResult> {",
);

fs.writeFileSync(chatFile, chatCode);
console.log("Patched scripted-chat-model.ts");
