import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { input } from "@inquirer/prompts";
import { ScaffoldError } from "../scaffold/errors.js";
import { isComplete, specFromFlags } from "../scaffold/flags.js";
import { namesOf } from "../scaffold/names.js";
import { planProject } from "../scaffold/project.js";
import { askMissing } from "../scaffold/questions.js";
import { applyChanges } from "../scaffold/write.js";

// gc create <name> [--agents "a:role,…"] [--tools "a:tool,…"] [--mcp none|filesystem:<dir>|command:<cmd>:<tool>] [--rag none|<folder>] [--yes] [--skip-install]
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    agents: { type: "string" },
    tools: { type: "string" },
    mcp: { type: "string" },
    rag: { type: "string" },
    yes: { type: "boolean", short: "y" },
    "skip-install": { type: "boolean" },
  },
});

try {
  const name = positionals[0] ?? (await input({ message: "Project (and first workflow) name:" }));
  const partial = specFromFlags(name, values);
  const spec =
    isComplete(partial) && (values.yes === true || values.agents !== undefined)
      ? partial
      : await askMissing(partial);
  const folder = namesOf(name).kebab;
  const root = join(process.cwd(), folder);
  const written = await applyChanges(root, { create: planProject(spec), modify: [] });
  process.stdout.write(`Created ${folder}/ (${String(written.length)} files)\n`);
  if (values["skip-install"] !== true) {
    const install = spawnSync("npm", ["install"], { cwd: root, stdio: "inherit" });
    if (install.status !== 0)
      throw new ScaffoldError("npm install failed — run it in the project folder");
  }
  process.stdout.write(
    `\nNext:\n  cd ${folder}\n  cp .env.example .env    # your OPENROUTER_API_KEY\n  npm run chat\n`,
  );
} catch (error) {
  if (!(error instanceof ScaffoldError)) throw error;
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
