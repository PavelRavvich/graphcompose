#!/usr/bin/env node
import { runWithStar } from "./star.js";
import { helpFor, usage } from "./usage.js";
/** Commands → their entry modules; eval-like commands keep their name as the first argument. */
const ENTRIES = {
    chat: { module: "../chat.js", keepName: false },
    run: { module: "../cli.js", keepName: false },
    describe: { module: "../describe.js", keepName: false },
    check: { module: "../check.js", keepName: false },
    "rag:index": { module: "../rag-index.js", keepName: false },
    eval: { module: "../eval/cli.js", keepName: true },
    replay: { module: "../eval/cli.js", keepName: true },
    golden: { module: "../eval/cli.js", keepName: true },
    compare: { module: "../eval/cli.js", keepName: true },
    create: { module: "./create.js", keepName: false },
    generate: { module: "./generate.js", keepName: false },
};
/** Short names, Angular-style: `gc c <name>`, `gc g tool <name>`. */
const ALIASES = { c: "create", g: "generate" };
const argv = process.argv.slice(2);
const [given, rawTopic] = argv;
const name = given === undefined ? undefined : (ALIASES[given] ?? given);
const topic = rawTopic === undefined ? undefined : (ALIASES[rawTopic] ?? rawTopic);
const entry = name === undefined ? undefined : ENTRIES[name];
const isHelp = name === undefined || name === "help" || name === "--help" || name === "-h";
/** `gc help [<command>]`. */
function showHelp() {
    const text = topic === undefined ? usage() : helpFor(topic);
    process.stdout.write(text ?? `Unknown command "${topic ?? ""}".\n\n${usage()}`);
    process.exitCode = text === undefined ? 1 : 0;
}
async function dispatch() {
    if (isHelp)
        showHelp();
    else if (entry === undefined) {
        process.stderr.write(`Unknown command "${name}".\n\n${usage()}`);
        process.exitCode = 1;
    }
    else {
        if (!entry.keepName)
            process.argv.splice(2, 1);
        await import(entry.module);
    }
}
const star = { isTTY: process.stderr.isTTY, env: process.env, argv };
if ((await runWithStar(dispatch, star, process.stderr)) === "threw")
    process.exitCode = 1;
