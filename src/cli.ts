import "dotenv/config";
import { createAppDeps } from "./app.js";
import { runAgent } from "./index.js";

// Usage: npm start -- "your task"
const task = process.argv.slice(2).join(" ");
const result = await runAgent({ task }, createAppDeps());
const route = result.route.length > 0 ? result.route.join(" → ") : "(none)";

process.stdout.write(`${result.answer}\n`);
process.stderr.write(`route: ${route} | stop: ${result.stopReason}\n`);
process.stderr.write(`budget for this run: $${result.budgetUsd.toFixed(4)}\n`);
process.stderr.write(
  `cost: $${result.cost.totalUsd.toFixed(6)} in ${String(result.cost.calls)} calls ` +
    `${JSON.stringify(result.cost.byCaller)}\n`,
);
