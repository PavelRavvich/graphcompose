import "dotenv/config";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline";
import { parseArgs, styleText } from "node:util";
import { createAppDeps } from "./app.js";
import { bundleNamed } from "./bundles.js";
import { summaryLine, threadLine, untilDone } from "./cli/approve.js";
import { costSummary, costTotal, costTrace } from "./cli/finops.js";
import { askWith } from "./cli/ask.js";
import { onInterruptKey } from "./cli/keys.js";
import { askMessage } from "./cli/multiline.js";
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
const turn = { interrupted: false };
/** A turn: loader, and Esc / Ctrl+C abort it through its signal. */
const busy = async <T>(work: (signal: AbortSignal | undefined) => Promise<T>): Promise<T> => {
  const controller = new AbortController();
  const stopKeys = onInterruptKey(stdin, () => {
    turn.interrupted = true;
    controller.abort();
  });
  try {
    return await withSpinner(stdout, "thinking · esc to interrupt", () => work(controller.signal));
  } finally {
    stopKeys();
  }
};

say(
  styleText(
    "dim",
    `Chat with "${values.config}". /new — new conversation, /exit — quit, \\ + Enter — new line, Esc — interrupt.`,
  ),
);
try {
  for (;;) {
    const line = (
      await askMessage(ask, styleText("bold", "you › "), styleText("dim", "  … "))
    )?.trim();
    if (line === undefined || line === "/exit") break;
    if (line === "") continue;
    if (line === "/new") {
      threadId = undefined;
      say(styleText("dim", "— new conversation —"));
      continue;
    }
    try {
      const input = { task: line, ...(threadId === undefined ? {} : { threadId }) };
      turn.interrupted = false;
      const first = await busy((signal) => runAgent(input, deps, { signal }));
      const result = await untilDone(first, deps, ask, busy);
      threadId = result.threadId;
      say(`${styleText("cyan", "agent ›")} ${result.answer}`);
      say(styleText("dim", `  ${threadLine(result)}`));
      say(styleText("dim", `  ${summaryLine(result)}`));
      say(styleText("dim", `  ${costSummary(result.cost)}`));
      costTrace(result.cost).forEach((line) => {
        say(styleText("dim", `    ${line}`));
      });
      say(styleText("bold", `  ${costTotal(result.cost)}`));
    } catch (error) {
      if (turn.interrupted) say(styleText("yellow", "interrupted"));
      else
        say(styleText("red", `error › ${error instanceof Error ? error.message : String(error)}`));
    }
  }
} finally {
  rl.close();
  await deps.close();
}
