import { parseArgs } from "node:util";
import { ScaffoldError } from "../scaffold/errors.js";
import { KINDS, planGenerate } from "../scaffold/generate.js";
import { applyChanges } from "../scaffold/write.js";

class CLIError extends Error {
  constructor(
    message: string,
    public readonly code: number,
  ) {
    super(message);
    this.name = "CLIError";
  }
}

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
    url: { type: "string" },
    json: { type: "boolean" },
    "dry-run": { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help) {
  process.stdout.write(`Usage: gc generate <${KINDS.join("|")}> <name> [options]\n`);
  process.exit(0);
}

try {
  const [kind, name] = positionals;
  if (kind === undefined || name === undefined) {
    throw new CLIError(
      `Usage: gc generate <${KINDS.join("|")}> <name> [options] — gc help generate`,
      2,
    );
  }

  const plan = await planGenerate(kind, name, values, process.cwd());

  if (values["dry-run"]) {
    if (values.json) {
      process.stdout.write(JSON.stringify(plan, null, 2) + "\n");
    } else {
      process.stdout.write(
        `Dry run: would write ${String(plan.create.length + plan.modify.length)} files\n`,
      );
    }
    process.exit(0);
  }

  const written = await applyChanges(process.cwd(), plan);

  if (values.json) {
    process.stdout.write(JSON.stringify({ written, success: true }, null, 2) + "\n");
  } else {
    process.stdout.write(`${written.map((path) => `  ${path}`).join("\n")}\n`);
  }
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (values.json) {
    process.stderr.write(JSON.stringify({ error: message, success: false }) + "\n");
  } else {
    process.stderr.write(`${message}\n`);
  }

  if (error instanceof CLIError) {
    process.exitCode = error.code;
  } else if (error instanceof ScaffoldError) {
    process.exitCode = 3;
  } else {
    process.exitCode = 2; // Validation errors
  }
}
