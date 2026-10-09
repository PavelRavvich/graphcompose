import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ScaffoldError } from "./errors.js";
/** All or nothing: any new file that already exists → an error and nothing is written (AC3). */
export async function applyChanges(root, changes) {
  const clashes = changes.create
    .filter((file) => existsSync(join(root, file.path)))
    .map((file) => file.path);
  if (clashes.length > 0) {
    throw new ScaffoldError(`Already exists, nothing was written: ${clashes.join(", ")}`);
  }
  const missing = changes.modify
    .filter((file) => !existsSync(join(root, file.path)))
    .map((file) => file.path);
  if (missing.length > 0)
    throw new ScaffoldError(`Not found, nothing was written: ${missing.join(", ")}`);
  for (const file of [...changes.create, ...changes.modify]) {
    const target = join(root, file.path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.content);
  }
  return [...changes.create, ...changes.modify].map((file) => file.path);
}
