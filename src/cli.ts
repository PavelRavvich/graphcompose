import "dotenv/config";
import { stdin, stderr } from "node:process";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { createAppDeps } from "./app.js";
import { bundleNamed } from "./bundles.js";
import { summaryLine, untilDone } from "./cli/approve.js";
import { costSummary, costTrace } from "./cli/finops.js";
import { askWith } from "./cli/ask.js";
import { runAgent } from "./index.js";

// Usage: npm start -- [--config <name>] [--thread <id>] "your task"   (interactive: npm run chat)
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { config: { type: "string", default: "default" }, thread: { type: "string" } },
});
const deps = await createAppDeps(process.env, undefined, bundleNamed(values.config));
const rl = createInterface({ input: stdin, terminal: false });
const result = await runAgent(
  {
    task: positionals.join(" "),
    ...(values.thread === undefined ? {} : { threadId: values.thread }),
  },
  deps,
)
  .then((first) =>
    untilDone(
      first,
      deps,
      askWith(rl, (text) => stderr.write(text)),
    ),
  )
  .finally(async () => {
    rl.close();
    await deps.close();
  });

process.stdout.write(`${result.answer}\n`);
process.stderr.write(`config: ${values.config} | ${summaryLine(result)}\n`);
process.stderr.write(`cost: ${costSummary(result.cost)}\n`);
costTrace(result.cost).forEach((line) => process.stderr.write(`  ${line}\n`));
process.stderr.write(`thread: ${result.threadId}  (continue with --thread ${result.threadId})\n`);
