import "dotenv/config";
import { stdin, stderr } from "node:process";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { createAppDeps, type AppDeps } from "./app.js";
import { bundleNamed } from "./bundles.js";
import { resumeAgent, runAgent, type AgentRunResult } from "./index.js";

// Usage: npm start -- [--config <name>] [--thread <id>] "your task"
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { config: { type: "string", default: "default" }, thread: { type: "string" } },
});

/** A paused run asks the human in the terminal, then continues in the same process. */
async function untilDone(first: AgentRunResult, deps: AppDeps): Promise<AgentRunResult> {
  const rl = createInterface({ input: stdin, output: stderr });
  let result = first;
  try {
    while (result.status === "paused" && result.pending !== undefined) {
      const { agent, tool, args } = result.pending;
      const reply = await rl.question(
        `${agent} wants to call ${tool} ${JSON.stringify(args)} — approve? [y/N] `,
      );
      const approve = /^y(es)?$/i.test(reply.trim());
      result = await resumeAgent(
        result,
        approve ? { approve } : { approve, note: "declined in the CLI" },
        deps,
      );
    }
  } finally {
    rl.close();
  }
  return result;
}

const deps = await createAppDeps(process.env, undefined, bundleNamed(values.config));
const result = await runAgent(
  {
    task: positionals.join(" "),
    ...(values.thread === undefined ? {} : { threadId: values.thread }),
  },
  deps,
)
  .then((first) => untilDone(first, deps))
  .finally(() => deps.close());
const route = result.route.length > 0 ? result.route.join(" → ") : "(none)";

process.stdout.write(`${result.answer}\n`);
process.stderr.write(`config: ${values.config} | route: ${route} | stop: ${result.stopReason}\n`);
process.stderr.write(`budget for this run: $${result.budgetUsd.toFixed(4)}\n`);
process.stderr.write(`thread: ${result.threadId}  (continue with --thread ${result.threadId})\n`);
process.stderr.write(
  `cost: $${result.cost.totalUsd.toFixed(6)} in ${String(result.cost.calls)} calls ` +
    `${JSON.stringify(result.cost.byCaller)}\n`,
);
