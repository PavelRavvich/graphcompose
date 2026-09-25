import "dotenv/config";
import { parseArgs } from "node:util";
import { createAppDeps, type AppDeps } from "../app.js";
import { loadWorkflow } from "../cli/load-workflow.js";
import { withProfile } from "../profile-workflow.js";
import { pairwise, runProfile, type ProfileOutcome } from "./compare.js";
import { configDiff, formatComparison, profileReport } from "./compare-report.js";
import { evaluate } from "./eval.js";
import { goldenFile, goldenFromRecent, loadGolden, saveGolden } from "./golden.js";
import { replay } from "./replay.js";

// graphcompose eval    --workflow <path> [--profile <p>] [--version <v>] [--limit N]
// graphcompose replay  --workflow <path> [--profile <p>] --version <v> [--limit N]
// graphcompose compare --workflow <path> --profiles base,<p>… [--golden <name> | --last N]
// graphcompose golden  add --workflow <path> --name <name> [--from-last N]
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    workflow: { type: "string", default: "./src/workflow.ts" },
    profile: { type: "string" },
    profiles: { type: "string", default: "base" },
    version: { type: "string" },
    limit: { type: "string", default: "100" },
    golden: { type: "string" },
    last: { type: "string", default: "20" },
    name: { type: "string" },
    "from-last": { type: "string", default: "20" },
  },
});
const out = (line: string): void => {
  process.stdout.write(`${line}\n`);
};
const depsFor = async (profile: string | undefined): Promise<AppDeps> => {
  const deps = await createAppDeps(
    await withProfile(await loadWorkflow(values.workflow), profile),
    process.env,
  );
  deps.warnings.forEach((warning) => process.stderr.write(`warning: ${warning}\n`));
  return deps;
};

async function evalOrReplay(command: string | undefined): Promise<void> {
  const deps = await depsFor(values.profile);
  const limit = Number(values.limit);
  try {
    if (command === "replay") {
      if (values.version === undefined) throw new Error("--version is required for replay");
      out(
        JSON.stringify(
          await replay(deps, deps.evaluation, { promptVersion: values.version, limit }),
          null,
          2,
        ),
      );
      return;
    }
    const report = await evaluate(deps.evaluation, deps.config.name, {
      ...(values.version === undefined ? {} : { promptVersion: values.version }),
      limit,
    });
    out(JSON.stringify(report));
    for (const row of await deps.terns.summary(deps.config.name)) out(JSON.stringify(row));
  } finally {
    await deps.close();
  }
}

async function golden(): Promise<void> {
  if (positionals[1] !== "add" || values.name === undefined)
    throw new Error(
      "usage: graphcompose golden add --workflow <path> --name <name> [--from-last N]",
    );
  const deps = await depsFor(undefined);
  try {
    const set = await goldenFromRecent(
      deps.terns,
      deps.config.name,
      values.name,
      Number(values["from-last"]),
    );
    const file = goldenFile(process.cwd(), deps.config.name, values.name);
    await saveGolden(file, set);
    out(`${String(set.tasks.length)} tasks → ${file}`);
  } finally {
    await deps.close();
  }
}

async function compare(): Promise<void> {
  const names = values.profiles
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name !== "");
  const runs = await Promise.all(names.map(async (name) => ({ name, deps: await depsFor(name) })));
  try {
    const [base] = runs;
    if (base === undefined || runs.length < 2)
      throw new Error("--profiles needs at least two, e.g. base,<profile>");
    const tasks =
      values.golden === undefined
        ? (await base.deps.terns.recentOriginals(base.deps.config.name, Number(values.last))).map(
            (t) => t.task,
          )
        : (
            await loadGolden(goldenFile(process.cwd(), base.deps.config.name, values.golden))
          ).tasks.map((t) => t.task);
    const outcomes: ProfileOutcome[] = [];
    for (const run of runs)
      outcomes.push(await runProfile({ ...run, evaluation: run.deps.evaluation }, tasks));
    const [baseline] = outcomes;
    const rows = [];
    for (const [i, outcome] of outcomes.entries()) {
      const other = runs[i];
      if (baseline === undefined || other === undefined) continue;
      const pair = i === 0 ? null : await pairwise(base.deps.evaluation, tasks, baseline, outcome);
      rows.push(profileReport(outcome, pair, i === 0 ? [] : configDiff(base.deps, other.deps)));
    }
    formatComparison(tasks.length, rows).forEach(out);
  } finally {
    await Promise.all(runs.map((run) => run.deps.close()));
  }
}

const command = positionals[0];
if (command === "compare") await compare();
else if (command === "golden") await golden();
else await evalOrReplay(command);
