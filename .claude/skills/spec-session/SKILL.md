---
name: spec-session
description: Conveyor stage 2 → board status Backlog. For issues in Triage, decides the technical side through quizzes and writes into the issue a detailed spec, an implementation plan, acceptance criteria split into automated (tests) and manual (plain-language instructions for a human — where to go, what to do, what to see), test cases, wiki pages to update and dependencies. Use after triage, or whenever the user says "spec", "спека", "план имплементации", "распиши тикет", or wants issues ready for autonomous implementation.
---

# spec-session

Conveyor: Triage → **Backlog** → In progress → Test → Done.
This stage: the **technical** side. Output: an issue a fresh agent session can implement with no
questions, in status **Backlog**. The spec and the plan live in the issue — never in repo files.

Questions follow `.claude/skills/QUIZ.md` — read it before the first question. Technical options
state their price in complexity, cost per run, latency, risk and reversibility.

## Input

Issue numbers, or "everything in Triage": `scripts/ticket.sh list Triage`. Issues labelled
`blocked` are skipped with a note.

## Steps

1. **Load.** `gh issue view <N> --comments` (+ parent / sub-issues), `scripts/wiki.sh pull`, and
   read the code the issue touches. The code wins over any description.
2. **Shared contracts first.** When several issues are specced together, settle what they share
   (types, state fields, config keys, public functions) and write it into the first issue that
   introduces it; others reference it.
3. **Quiz rounds** for every decision with more than one reasonable option. Choices with one
   sensible answer are made silently and recorded in the log.
4. **Write the technical part** under the triage part (template below):
   `gh issue edit <N> --body-file -`. If the body would exceed 65 536 characters, the plan goes to
   numbered comments `Implementation plan (1/2)` via `gh issue comment <N> --body-file -`.
5. **Parallelism.** In the plan, list the files touched and mark `Parallel: yes` when the issue
   shares no files and no unmerged dependency with other Backlog issues — `implement` uses this.
6. **Status.** `scripts/ticket.sh status <N> Backlog`.
7. **Report**: issues ready, what can run in parallel, what is blocked and why. Next: `implement`.

## Issue body — technical part (appended below the triage part)

```markdown
## Spec

Behaviour, inputs/outputs, types, config keys, errors — concrete and testable.

## Implementation plan

1. `<file>` — <change>
2. ...
   Files touched: `src/...`, `tests/...` · Parallel: yes | no (<reason>) · Depends on: #N | none

## Acceptance criteria

### Automated

- [ ] <criterion> — `tests/<file>.test.ts` › "<test name>"

### Manual

For a human, in plain language. Each check:

1. **Where**: <command to run / page to open / file to look at>
2. **Do**: <exact steps, copy-pasteable commands>
3. **Expect**: <what you should see>
4. **Not OK if**: <what a failure looks like>

## Test cases

**Main:** ... · **Edge:** ... · **Regression:** ...

## Wiki to update

<page> — what changes · new significant decision → `ADR-NNNN-Title`

## Spec log

- <question> → **<choice>** — <why; the price accepted>
```
