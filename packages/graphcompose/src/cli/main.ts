#!/usr/bin/env node
import { USAGE } from "./usage.js";

/** Commands → their entry modules; eval-like commands keep their name as the first argument. */
const COMMANDS: Readonly<Record<string, { readonly module: string; readonly keepName: boolean }>> =
  {
    chat: { module: "../chat.js", keepName: false },
    run: { module: "../cli.js", keepName: false },
    describe: { module: "../describe.js", keepName: false },
    "rag:index": { module: "../rag-index.js", keepName: false },
    eval: { module: "../eval/cli.js", keepName: true },
    replay: { module: "../eval/cli.js", keepName: true },
    golden: { module: "../eval/cli.js", keepName: true },
    compare: { module: "../eval/cli.js", keepName: true },
  };

const name = process.argv[2];
const command = name === undefined ? undefined : COMMANDS[name];
if (command === undefined) {
  process.stdout.write(USAGE);
  process.exitCode = name === undefined || name === "--help" || name === "-h" ? 0 : 1;
} else {
  if (!command.keepName) process.argv.splice(2, 1);
  await import(command.module);
}
