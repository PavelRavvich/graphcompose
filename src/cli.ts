import "dotenv/config";
import { parseArgs } from "node:util";
import { createAppDeps } from "./app.js";
import { runAgent } from "./index.js";

// Usage: npm start -- [--thread <id>] "your task"
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { thread: { type: "string" } },
});
const task = positionals.join(" ");
const deps = await createAppDeps();
const result = await runAgent(
  { task, ...(values.thread === undefined ? {} : { threadId: values.thread }) },
  deps,
).finally(() => deps.close());
const route = result.route.length > 0 ? result.route.join(" → ") : "(none)";

process.stdout.write(`${result.answer}\n`);
process.stderr.write(`route: ${route} | stop: ${result.stopReason}\n`);
process.stderr.write(`budget for this run: $${result.budgetUsd.toFixed(4)}\n`);
process.stderr.write(`thread: ${result.threadId}  (continue with --thread ${result.threadId})\n`);
process.stderr.write(
  `cost: $${result.cost.totalUsd.toFixed(6)} in ${String(result.cost.calls)} calls ` +
    `${JSON.stringify(result.cost.byCaller)}\n`,
);
