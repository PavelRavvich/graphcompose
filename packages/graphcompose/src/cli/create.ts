import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { parseArgs } from "node:util";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { input } from "@inquirer/prompts";
import { ScaffoldError } from "../scaffold/errors.js";
import { isComplete, specFromFlags } from "../scaffold/flags.js";
import { namesOf } from "../scaffold/names.js";
import { planProject } from "../scaffold/project.js";
import { askMissing } from "../scaffold/questions.js";
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
    agents: { type: "string" },
    tools: { type: "string" },
    mcp: { type: "string" },
    rag: { type: "string" },
    yes: { type: "boolean", short: "y" },
    "skip-install": { type: "boolean" },
    json: { type: "boolean" },
    "dry-run": { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help) {
  process.stdout.write(`Usage: gc create <name> [options]\n`);
  process.exit(0);
}

try {
  let name = positionals[0];
  if (name === undefined) {
    if (!process.stdin.isTTY) {
      throw new CLIError(
        "Cannot prompt for project name in non-TTY mode. Provide <name> as argument.",
        2,
      );
    }
    name = await input({ message: "Project (and first workflow) name:" });
  }

  const partial = specFromFlags(name, values);
  const spec =
    isComplete(partial) && (values.yes === true || values.agents !== undefined)
      ? partial
      : await askMissing(partial);

  const folder = namesOf(name).kebab;
  const root = join(process.cwd(), folder);
  const plan = { create: planProject(spec), modify: [] };

  if (values["dry-run"]) {
    if (values.json) {
      process.stdout.write(JSON.stringify(plan, null, 2) + "\n");
    } else {
      process.stdout.write(
        `Dry run: would create ${folder}/ (${String(plan.create.length)} files)\n`,
      );
    }
    process.exit(0);
  }

  const written = await applyChanges(root, plan);

  if (values.json) {
    process.stdout.write(JSON.stringify({ folder, written, success: true }, null, 2) + "\n");
  } else {
    process.stdout.write(`Created ${folder}/ (${String(written.length)} files)\n`);
  }

  if (values["skip-install"] !== true) {
    const install = spawnSync("npm", ["install"], { cwd: root, stdio: "inherit" });
    if (install.status !== 0) {
      throw new CLIError("npm install failed — run it in the project folder", 4);
    }
  }

  if (!values.json) {
    process.stdout.write(
      `\nNext:\n  cd ${folder}\n  cp .env.example .env    # your OPENROUTER_API_KEY\n  npm run chat\n`,
    );
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
    process.exitCode = 2; // Validation or non-TTY
  }
}
