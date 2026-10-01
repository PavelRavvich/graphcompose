import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { ScaffoldError } from "./errors.js";
import { namesOf } from "./names.js";
import type { FileToWrite } from "./write.js";

/** A required option of `gc generate <kind>`. */
export const need = (value: string | undefined, flag: string, kind: string): string => {
  if (value === undefined || value === "")
    throw new ScaffoldError(`gc generate ${kind} needs ${flag}`);
  return value;
};

/** A file of the project (relative to its root) to rewire. */
export const read = (root: string, path: string): FileToWrite => {
  try {
    return { path, content: readFileSync(join(root, path), "utf8") };
  } catch {
    throw new ScaffoldError(`Not found: ${path}`);
  }
};

/** The workflow a part goes into: its folder and module file (`--workflow src/x/x.workflow.ts`). */
export function targetWorkflow(
  root: string,
  path: string,
  kind: string,
): { dir: string; module: FileToWrite } {
  const file = need(path, "--workflow <path>", kind).replace(/^\.\//, "");
  if (!basename(file).endsWith(".workflow.ts"))
    throw new ScaffoldError(`--workflow must be a *.workflow.ts file: ${file}`);
  return { dir: dirname(file), module: read(root, file) };
}

export const agentFile = (root: string, dir: string, agent: string): FileToWrite =>
  read(root, `${dir}/agents/${namesOf(agent).kebab}.agent.ts`);
