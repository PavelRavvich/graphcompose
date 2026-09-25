import { parseArgs } from "node:util";
import { ScaffoldError } from "../scaffold/errors.js";
import { KINDS, planGenerate } from "../scaffold/generate.js";
import { applyChanges } from "../scaffold/write.js";

// gc generate <workflow|agent|tool|mcp|rag> <name> --workflow <path> [--agent <name>] [--description "…"]
//   [--dir <folder> | --command <cmd> --tool <name>] [--folder <dir>]
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    workflow: { type: "string" },
    agent: { type: "string" },
    description: { type: "string" },
    dir: { type: "string" },
    command: { type: "string" },
    tool: { type: "string" },
    folder: { type: "string" },
  },
});

try {
  const [kind, name] = positionals;
  if (kind === undefined || name === undefined)
    throw new ScaffoldError(
      `Usage: gc generate <${KINDS.join("|")}> <name> [options] — gc help generate`,
    );
  const written = await applyChanges(
    process.cwd(),
    planGenerate(kind, name, values, process.cwd()),
  );
  process.stdout.write(`${written.map((path) => `  ${path}`).join("\n")}\n`);
} catch (error) {
  if (!(error instanceof ScaffoldError)) throw error;
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
