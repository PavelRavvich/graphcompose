import "dotenv/config";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline";
import { parseArgs, styleText } from "node:util";
import { createAppDeps } from "./app.js";
import { bundleNamed } from "./bundles.js";
import { summaryLine, untilDone } from "./cli/approve.js";
import { costSummary, costTrace } from "./cli/finops.js";
import { askWith } from "./cli/ask.js";
import { withSpinner } from "./cli/spinner.js";
import { runAgent } from "./index.js";

// Usage: npm run chat -- [--config <name>] [--thread <id>]
const { values } = parseArgs({
  options: { config: { type: "string", default: "default" }, thread: { type: "string" } },
});
const deps = await createAppDeps(process.env, undefined, bundleNamed(values.config));
const rl = createInterface({ input: stdin, terminal: false });
const ask = askWith(rl, (text) => stdout.write(text));
const say = (text: string): void => {
  stdout.write(`${text}\n`);
};
let threadId = values.thread;
const busy = <T>(work: () => Promise<T>): Promise<T> => withSpinner(stdout, "thinking", work);

say(styleText("dim", `Chat with "${values.config}". /new — new conversation, /exit — quit.`));
try {
  for (;;) {
    const line = (await ask(styleText("bold", "you › ")))?.trim();
    if (line === undefined || line === "/exit") break;
    if (line === "") continue;
    if (line === "/new") {
      threadId = undefined;
      say(styleText("dim", "— new conversation —"));
      continue;
    }
    try {
      const input = { task: line, ...(threadId === undefined ? {} : { threadId }) };
      const first = await busy(() => runAgent(input, deps));
      const result = await untilDone(first, deps, ask, busy);
      threadId = result.threadId;
      say(`${styleText("cyan", "agent ›")} ${result.answer}`);
      say(styleText("dim", `  ${summaryLine(result)}`));
      say(styleText("dim", `  ${costSummary(result.cost)}`));
      costTrace(result.cost).forEach((line) => {
        say(styleText("dim", `    ${line}`));
      });
    } catch (error) {
      say(styleText("red", `error › ${error instanceof Error ? error.message : String(error)}`));
    }
  }
} finally {
  rl.close();
  await deps.close();
}
