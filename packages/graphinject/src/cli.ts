import "dotenv/config";
import { stdin, stderr } from "node:process";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { createAppDeps } from "./app.js";
import { loadWorkflow } from "./cli/load-workflow.js";
import { withProfile } from "./profile-workflow.js";
import { attemptsLines, memoryLine, summaryLine, threadLine, untilDone } from "./cli/approve.js";
import { costSummary, costTotal, costTrace } from "./cli/finops.js";
import { askWith } from "./cli/ask.js";
import { withSpinner } from "./cli/spinner.js";
import { runAgent } from "./index.js";

// graphinject run --workflow <path> [--thread <id>] "your task"   (interactive: graphinject chat)
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    workflow: { type: "string", default: "./src/workflow.ts" },
    profile: { type: "string" },
    thread: { type: "string" },
  },
});
const deps = await createAppDeps(
  await withProfile(await loadWorkflow(values.workflow), values.profile),
  process.env,
);
deps.warnings.forEach((warning) => {
  stderr.write(`warning: ${warning}\n`);
});
const rl = createInterface({ input: stdin, terminal: false });
const busy = <T>(work: (signal: AbortSignal | undefined) => Promise<T>): Promise<T> =>
  withSpinner(stderr, "thinking", () => work(undefined));
const input = {
  task: positionals.join(" "),
  ...(values.thread === undefined ? {} : { threadId: values.thread }),
};
const result = await busy(() => runAgent(input, deps))
  .then((first) =>
    untilDone(
      first,
      deps,
      askWith(rl, (text) => stderr.write(text)),
      busy,
    ),
  )
  .finally(async () => {
    rl.close();
    await deps.close();
  });

process.stdout.write(`${result.answer}\n`);
process.stderr.write(`${threadLine(result)}  (continue with --thread ${result.threadId})\n`);
process.stderr.write(`config: ${deps.config.name} | ${summaryLine(result)}\n`);
attemptsLines(result).forEach((line) => process.stderr.write(`${line}\n`));
const memory = memoryLine(result);
if (memory !== undefined) process.stderr.write(`${memory}\n`);
process.stderr.write(`cost: ${costSummary(result.cost)}\n`);
costTrace(result.cost).forEach((line) => process.stderr.write(`  ${line}\n`));
process.stderr.write(`${costTotal(result.cost)}\n`);
