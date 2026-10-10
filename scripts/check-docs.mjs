#!/usr/bin/env node
// Docs that compile (#196), run by `npm run check` after the build:
//   1. every ```ts block of the docs typechecks against the built `graphcompose` package
//      (conventions — file=, no-check: <reason>, <!-- snippet-context --> — in scripts/docs/snippets.mjs);
//   2. every `scripts/…`, `npm run …`, `make …` and `gc …` they mention exists, and so does every
//      `gc …` the CLI's own sources print.
// Options: --docs a.md,b.md (default: the root docs and docs/**), --out <dir> (keep the written
// snippets there; default a temporary folder), --no-cli-sources (skip step 2 for the CLI's sources).
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { conventionProblems, snippetsOf } from "./docs/snippets.mjs";
import { prepareRoot, typecheck, writeDoc } from "./docs/typecheck.mjs";
import { cliCommands, sourceLines } from "./docs/cli-commands.mjs";
import { commandProblems, knownOf, referenceProblems } from "./docs/references.mjs";

const REPO = realpathSync(new URL("..", import.meta.url).pathname);
const ROOT_DOCS = ["README.md", "CLAUDE.md", "QUALITY.md", "WORKFLOW.md"];

const { values } = parseArgs({
  options: {
    docs: { type: "string" },
    out: { type: "string" },
    "no-cli-sources": { type: "boolean", default: false },
  },
});

function docsFolder(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => join(entry.parentPath, entry.name));
}

const docs = values.docs
  ? values.docs.split(",").map((doc) => resolve(doc))
  : [...ROOT_DOCS.map((doc) => join(REPO, doc)), ...docsFolder(join(REPO, "docs"))];
const out = values.out ? resolve(values.out) : mkdtempSync(join(tmpdir(), "graphcompose-docs-"));
mkdirSync(out, { recursive: true });
const root = realpathSync(out);
prepareRoot(root, REPO);
const known = knownOf(REPO, cliCommands(REPO));

const problems = [];
let compiled = 0;
for (const path of docs) {
  const doc = relative(process.cwd(), path) || path;
  const markdown = readFileSync(path, "utf8");
  const snippets = snippetsOf(markdown, doc);
  problems.push(...conventionProblems(snippets), ...referenceProblems(doc, markdown, known));
  const { files } = writeDoc(root, doc, snippets);
  compiled += files.length;
  problems.push(...typecheck(root, files));
}
if (!values["no-cli-sources"])
  for (const { place, text } of sourceLines(REPO))
    for (const problem of commandProblems(text, known).filter((line) => line.includes("gc ")))
      problems.push(`${place}: ${problem}`);

if (!values.out) rmSync(out, { recursive: true, force: true });
if (problems.length > 0) {
  console.error(
    `Docs out of date with the code (${String(problems.length)}):\n  ${problems.join("\n  ")}`,
  );
  process.exit(1);
}
console.log(
  `docs ok: ${String(compiled)} snippets compiled in ${String(docs.length)} docs, references exist`,
);
