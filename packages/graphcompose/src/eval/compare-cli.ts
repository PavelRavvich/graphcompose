import {
  requiredText,
  textOption,
  type CommandContext,
  type CommandHandler,
} from "../cli/context.js";
import { usageError } from "../cli/errors.js";
import type { AppDeps } from "../app/app-deps.js";
import { depsFor } from "./cli-deps.js";
import { pairwise, runProfile, type ProfileOutcome } from "./compare.js";
import {
  configDiff,
  formatComparison,
  profileReport,
  type ProfileReport,
} from "./compare-report.js";
import { goldenFile, loadGolden } from "./golden.js";

interface ProfileRun {
  readonly name: string;
  readonly deps: AppDeps;
}

async function tasksOf(context: CommandContext, base: ProfileRun): Promise<string[]> {
  const golden = textOption(context.values, "golden");
  if (golden === undefined) {
    const last = Number(requiredText(context.values, "last"));
    return (await base.deps.terns.recentOriginals(base.deps.config.name, last)).map((t) => t.task);
  }
  const set = await loadGolden(goldenFile(context.io.cwd, base.deps.config.name, golden));
  return set.tasks.map((t) => t.task);
}

async function compareRuns(
  runs: readonly ProfileRun[],
  tasks: readonly string[],
): Promise<ProfileReport[]> {
  const [base] = runs;
  const outcomes: ProfileOutcome[] = [];
  for (const run of runs)
    outcomes.push(await runProfile({ ...run, evaluation: run.deps.evaluation }, tasks));
  const [baseline] = outcomes;
  const rows: ProfileReport[] = [];
  for (const [i, outcome] of outcomes.entries()) {
    const other = runs[i];
    if (base === undefined || baseline === undefined || other === undefined) continue;
    const pair = i === 0 ? null : await pairwise(base.deps.evaluation, tasks, baseline, outcome);
    rows.push(profileReport(outcome, pair, i === 0 ? [] : configDiff(base.deps, other.deps)));
  }
  return rows;
}

/** `gc compare --workflow <path> --profiles base,<p>… [--golden <name> | --last N]`. */
export const compareProfiles: CommandHandler = async (context) => {
  const names = requiredText(context.values, "profiles")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name !== "");
  if (names.length < 2)
    throw usageError(
      "compare",
      "usage.option-value",
      "--profiles needs at least two, e.g. base,<profile>",
    );
  const runs = await Promise.all(
    names.map(async (name) => ({ name, deps: await depsFor(context, name) })),
  );
  try {
    const [base] = runs;
    if (base === undefined) return {};
    const tasks = await tasksOf(context, base);
    const rows = await compareRuns(runs, tasks);
    formatComparison(tasks.length, rows).forEach(context.say);
    return { result: { tasks: tasks.length, profiles: rows } };
  } finally {
    await Promise.all(runs.map((run) => run.deps.close()));
  }
};
