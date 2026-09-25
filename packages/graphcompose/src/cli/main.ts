#!/usr/bin/env node
import { helpFor, usage } from "./usage.js";

/** Commands → their entry modules; eval-like commands keep their name as the first argument. */
const ENTRIES: Readonly<Record<string, { readonly module: string; readonly keepName: boolean }>> = {
  chat: { module: "../chat.js", keepName: false },
  run: { module: "../cli.js", keepName: false },
  describe: { module: "../describe.js", keepName: false },
  "rag:index": { module: "../rag-index.js", keepName: false },
  eval: { module: "../eval/cli.js", keepName: true },
  replay: { module: "../eval/cli.js", keepName: true },
  golden: { module: "../eval/cli.js", keepName: true },
  compare: { module: "../eval/cli.js", keepName: true },
};

const [name, topic] = process.argv.slice(2);
const entry = name === undefined ? undefined : ENTRIES[name];
if (name === undefined || name === "help" || name === "--help" || name === "-h") {
  const text = topic === undefined ? usage() : helpFor(topic);
  process.stdout.write(text ?? `Unknown command "${topic ?? ""}".\n\n${usage()}`);
  process.exitCode = text === undefined ? 1 : 0;
} else if (entry === undefined) {
  process.stderr.write(`Unknown command "${name}".\n\n${usage()}`);
  process.exitCode = 1;
} else {
  if (!entry.keepName) process.argv.splice(2, 1);
  await import(entry.module);
}
