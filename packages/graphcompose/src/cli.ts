import "dotenv/config";
import { stdin, stderr } from "node:process";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { createApp } from "./app/create-app.js";
import { loadWorkflowClass } from "./cli/load-workflow.js";
import { memoryLine, summaryLine, threadLine, untilDone } from "./cli/approve.js";
import { costSummary, costTotal, costTrace } from "./cli/finops.js";
import { askWith } from "./cli/ask.js";
import { withSpinner } from "./cli/spinner.js";
import { textStartOrFail } from "./cli/text-start.js";

// graphcompose run --workflow <path> [--thread <id>] "your task"   (interactive: graphcompose chat)
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    workflow: { type: "string", default: "./src/workflow.ts" },
    profile: { type: "string" },
    thread: { type: "string" },
  },
});
const app = await createApp(await loadWorkflowClass(values.workflow), { profile: values.profile });
app.warnings.forEach((warning) => {
  stderr.write(`warning: ${warning}\n`);
});
const rl = createInterface({ input: stdin, terminal: false });
const busy = <T>(work: (signal: AbortSignal | undefined) => Promise<T>): Promise<T> =>
  withSpinner(stderr, "thinking", () => work(undefined));
const thread = values.thread === undefined ? {} : { thread: values.thread };
const result = await busy(() =>
  app.run(textStartOrFail(app), { text: positionals.join(" ") }, thread),
)
  .then((first) =>
    untilDone(
      first,
      app,
      askWith(rl, (text) => stderr.write(text)),
      busy,
    ),
  )
  .finally(async () => {
    rl.close();
    await app.close();
  });

process.stdout.write(`${result.answer}\n`);
process.stderr.write(`${threadLine(result)}  (continue with --thread ${result.thread})\n`);
process.stderr.write(`config: ${app.name} | ${summaryLine(result)}\n`);
const memory = memoryLine(result);
if (memory !== undefined) process.stderr.write(`${memory}\n`);
process.stderr.write(`cost: ${costSummary(result.spend)}\n`);
costTrace(result.spend).forEach((line) => process.stderr.write(`  ${line}\n`));
process.stderr.write(`${costTotal(result.spend)}\n`);
