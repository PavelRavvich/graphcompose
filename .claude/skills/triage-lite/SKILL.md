---
name: triage-lite
description: Phase 1 of the pipeline. Turns a raw task statement into clarified requirements and a set of small GitHub issues (feature / bugfix / chore, MVP vs stretch) plus a session plan issue. Use at the very start of work on a new task, whenever the user pastes a task, assignment, requirements or says "triage", "break this down", "let's plan the tickets" — before any spec or code.
---

# triage-lite

Goal: in **15–20 minutes** go from a task statement to a ranked set of issues in GitHub.
No code, no detailed specs — that is the next phase (`spec-lite`).

## Where things live — no specs, plans or docs as files in the repo

| What                                                                                  | Where                                                                | How                                                                                           |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Tickets, discussion, **specs, implementation plans**, acceptance criteria, test cases | GitHub Issues of this repo                                           | `gh issue …` — the body is passed via stdin (`--body-file -`), never via a file               |
| Current-state docs: architecture, configuration, routers, FinOps                      | **GitHub Wiki** of this repo                                         | `scripts/wiki.sh pull` → edit `../<repo>.wiki/*.md` → `scripts/wiki.sh publish "docs(#N): …"` |
| Decisions                                                                             | Wiki pages `ADR-NNNN-Title` (template: `ADR-Template`, index: `ADR`) | same as docs                                                                                  |
| Rules                                                                                 | `QUALITY.md`, `WORKFLOW.md`, `CLAUDE.md` in the repo                 | regular PR                                                                                    |

Link wiki pages from issues and PRs by URL (`https://github.com/<owner>/<repo>/wiki/Routers`),
never copy their text into files.

## Steps

### 1. Restate

Restate the task in 2–3 sentences: what is being built, for whom, what "done" looks like.
Run `scripts/wiki.sh pull` and read the Wiki (`Home`, relevant pages) and the code (`src/`,
`CLAUDE.md`) so the plan starts from what already exists — do not ask what the Wiki answers.

### 2. Clarify — one batch of questions

Ask **all** questions in one message, max ~7, grouped:

- **Functional** — inputs, outputs, key behaviours, what the agent decides vs. what is fixed
- **Non-functional** — latency, cost (per-run / daily caps), determinism, error handling
- **Constraints** — models/providers, allowed libraries, interface (CLI / HTTP / library)
- **Out of scope** — what we explicitly will not build

If an answer is not available, choose a reasonable default and record it as an **Assumption**.
Do not ask a second round unless an answer changes the architecture.

### 3. Decompose

Produce 4–7 issues. Rules:

- **Vertical slices**: each issue delivers observable behaviour with its tests, implementable
  in ≤ 15 minutes by an agent.
- Type: `feature` / `bugfix` / `chore`. Priority: `mvp` or `stretch`.
- MVP set alone must produce a working, demoable result.
- Order by dependencies; mark `Depends on #N`.
- No "write tests" or "write docs" issues — tests and Wiki updates belong to every issue.

Show the table to the user and wait for OK:

| # | Type | Prio | Title | Depends on | One-line outcome |

### 4. Create issues

Body via stdin — no files:

```bash
gh issue create \
  --title "<imperative title>" \
  --label "type:<type>,prio:<mvp|stretch>,status:triaged" \
  --body-file - <<'BODY'
## Goal
<1–3 sentences>

## Rough acceptance criteria
- ...

## Dependencies
Depends on #N   (or "none")

## Notes / assumptions
- ...
BODY
```

### 5. Session plan issue

Create one issue titled `Session plan` (label `type:chore`) containing: restated task, answers to
questions, assumptions, out-of-scope list, a checklist of issues in implementation order (MVP
first) and a link to the Wiki. This is the single page an observer reads to follow the work.

## Output to the user

- Table of created issues with numbers and links
- Implementation order
- Next step: run `spec-lite`
