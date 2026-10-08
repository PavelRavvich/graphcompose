# Probes

All in the snapshot dir, never in the repo. Each probe records: command(s), raw numbers, verdict.
A probe that cannot run (no build, missing key) is `skipped` with the reason — never guessed.

## P0. Baseline

- The error baseline itself (tsc / lint / prettier / tests per package) is taken in SKILL step 0;
  here: build the framework, typecheck the example(s), time both (`time npx tsc --noEmit -p …`,
  `--extendedDiagnostics` for instantiation counts).
- Count `any` / `as any` / `as unknown as` / `@ts-ignore` / `eslint-disable` in `src/` and in the
  public `.d.ts` output (`grep -c`), list the top files.

## P1. Agent writes code (axis 2, 1, 17)

A fresh sub-agent gets: the snapshot path, README, CLAUDE.md/AGENTS.md, the example, and **one
task** typical for the framework, e.g. "add a new agent node `X` with a tool `Y` that depends on an
existing provider `Z`, reachable from the main router". It must reach a green typecheck and
tests of the example. It does not get this skill or the static findings.
Measure: iterations until green, `any`/casts introduced, files touched vs the minimum, whether it
used the CLI generator, what it read first, where it went wrong. Ask it at the end: "what was
unclear?" — record verbatim.

## P2. Misconfiguration matrix (axis 1, 4, 5)

For each mistake, write the minimal broken variant in a scratch copy of the example and record
**where** it is caught: `tsc` / lint / assembly (start) / first call at runtime / never.

Default matrix (adapt names to the framework):

1. Remove a provider/dependency a node needs.
2. Inject with the wrong type / wrong token.
3. Singleton depends on a per-run/per-thread thing.
4. Node reads a state field nobody writes; field type mismatch between writer and reader.
5. Router route points to a node not in the flow / flow node missing from routes.
6. Cycle without a router.
7. Tool schema and handler argument type disagree.
8. Prompt template uses a variable that is not supplied.
9. Output DTO of the finish does not match what the last node produces.
10. Duplicate registration of the same node/tool name.

Table: mistake → caught at → error text (first 3 lines) → could an agent fix it from the text
alone (yes/no). Assembly-time is acceptable for graph-shape errors; type mismatches caught only at
runtime are majors.

## P3. Error message test (axis 1)

Give the P2 error texts (only the texts) to a fresh sub-agent with the broken file; count how many
it fixes in one edit. Sub-agents cannot spawn sub-agents: either the main agent launches this one
after P2 returns, or the P2 agent self-judges (yes / partly / no) and marks it `confidence: medium`.

## P4. CLI contract (axis 17)

For every command in `--help`:

- run without TTY (`</dev/null`, `CI=1`) and without required args → must exit non-zero fast,
  with a message naming the missing flag; record hangs (timeout 20s).
- `--json` present? Valid JSON on stdout, nothing else on stdout?
- exit codes for: success, bad usage, invalid project.
- `--dry-run` present for writing commands? Shows a diff?
- startup time (`time … --help`), network calls on start (run with no network if possible).

## P5. Generators (axis 17)

For each generator, on a clean copy of the example:

1. run it → `tsc` + lint + tests green without edits?
2. run it again with the same args → idempotent / explicit conflict / duplicate?
3. run a combination (e.g. node + tool + wire to router) → still green?
4. diff size vs a minimal hand-written change; untouched code reformatted?
5. Compare generated code with the README/Wiki pattern for the same thing.

## P6. CLI discoverability (axis 17, 2)

A fresh sub-agent gets the task from P1 and access to the CLI `--help` only (plus the repo). Does
it find and use the generator, or hand-write? If it hand-writes, the CLI is not discoverable
enough — that is the finding.

## P7. Docs vs code (axis 14)

Take every code snippet and every command in README, CLAUDE.md, AGENTS.md, Wiki pages in the repo:
does the symbol/flag exist with that signature? List the stale ones.
