const fs = require("fs");
const path = "packages/graphcompose/src/tools/types.ts";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
  "readonly reportCost: (usd: number) => void;",
  `readonly reportCost: (usd: number) => void;\n  /**\n   * Pauses the run to wait for external input. The run stops here; when \`app.resume\` is called\n   * with the answer, the tool runs again from the start, and \`pause\` instantly returns the answer.\n   * **Do not put side effects before \`pause\`** — they will run twice!\n   */\n  readonly pause: <TAsk, TAnswer>(ask: TAsk) => TAnswer;`,
);

fs.writeFileSync(path, content);
