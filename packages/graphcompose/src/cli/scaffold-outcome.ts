import type { CommandContext, CommandOutcome } from "./context.js";
import type { Changes } from "../scaffold/write.js";
import { applyChanges } from "../scaffold/write.js";

const pathsOf = (files: Changes["create"]): string[] => files.map((file) => file.path);

/** `--dry-run`: what would be written (the plan, with contents under --json), nothing written. */
export function dryRun(context: CommandContext, plan: Changes, what: string): CommandOutcome {
  context.say(`Dry run: would write ${what}`);
  [...pathsOf(plan.create), ...pathsOf(plan.modify)].forEach((path) => {
    context.say(`  ${path}`);
  });
  return { result: { dryRun: true, plan } };
}

/** Writes the plan under `root` (all or nothing) and reports created / modified files. */
export async function write(
  root: string,
  plan: Changes,
  result: Record<string, unknown> = {},
): Promise<CommandOutcome> {
  const written = await applyChanges(root, plan);
  return {
    result: { ...result, written },
    created: pathsOf(plan.create),
    modified: pathsOf(plan.modify),
  };
}
