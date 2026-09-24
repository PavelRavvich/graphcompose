import "dotenv/config";
import { parseArgs } from "node:util";
import { createAppDeps } from "../app.js";
import { bundleNamed } from "../bundles.js";
import { evaluate } from "./eval.js";
import { replay } from "./replay.js";

// npm run eval   -- [--config <name>] [--version <v>] [--limit N]
// npm run replay -- [--config <name>] --version <v> [--limit N]
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    version: { type: "string" },
    limit: { type: "string", default: "100" },
    config: { type: "string", default: "default" },
  },
});
const deps = await createAppDeps(process.env, undefined, bundleNamed(values.config));
const limit = Number(values.limit);
try {
  if (positionals[0] === "replay") {
    if (values.version === undefined) throw new Error("--version is required for replay");
    const report = await replay(deps, deps.evaluation, { promptVersion: values.version, limit });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    const report = await evaluate(deps.evaluation, deps.config.name, {
      ...(values.version === undefined ? {} : { promptVersion: values.version }),
      limit,
    });
    process.stdout.write(`${JSON.stringify(report)}\n`);
    for (const row of await deps.terns.summary(deps.config.name)) {
      process.stdout.write(`${JSON.stringify(row)}\n`);
    }
  }
} finally {
  await deps.close();
}
