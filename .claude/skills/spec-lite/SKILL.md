---
name: spec-lite
description: Phase 2 of the pipeline. Writes a complete, implementation-ready spec and implementation plan into every triaged GitHub issue — spec, plan, acceptance criteria, test cases (main, edge, regression), wiki pages to update and what cannot be verified automatically. Use after triage-lite, or whenever the user says "spec", "write the specs", "plan the implementation", or wants issues made ready for autonomous implementation.
---

# spec-lite

Goal: in **20–25 minutes** make every `status:triaged` issue implementable by an agent without
further questions. One session covers all issues, so cross-issue contracts stay consistent.
**The spec and the implementation plan live in the issue itself** — never in repo files.

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

### 1. Load context

- `gh issue list --label status:triaged --json number,title,body,labels`
- Read the `Session plan` issue and the Wiki (`scripts/wiki.sh pull`).
- Read the code the issues touch. The code wins over any earlier description.

### 2. One batch of questions

Collect open questions across **all** issues, ask them in one message. Record answers and any
defaults you choose as assumptions. Skip if nothing is unclear.

### 3. Define shared contracts first

Before per-issue specs, fix what several issues depend on: graph state fields, node names,
router options, tool schemas, public function signatures. Put them in the first issue that
introduces them and reference from others (`see #N → Spec`).

### 4. Write spec + implementation plan into each issue

Replace the issue body via stdin:

```bash
gh issue edit <N> --body-file - <<'BODY'
## Goal
<carried over from triage>

## Spec
Behaviour, inputs/outputs, state changes, config fields, error handling. Concrete, testable.

## Implementation plan
1. <file> — <change>
2. ...
Files touched: `src/...`, `tests/...`   (respect QUALITY.md size limits)

## Acceptance criteria
- [ ] ...

## Test cases
**Main:** ...
**Edge:** empty/invalid input, model returns garbage, router failure, budget/daily cap, loop bound ...
**Regression:** behaviours of touched code that must not change

## Wiki to update
<page> — what changes. New significant decision → new page `ADR-NNNN-Title` + row in `ADR`.
"None" only if behaviour, config and architecture are unchanged.

## Not auto-verifiable
What a human must look at (answer quality, UX, prompt tone). "None" is valid.

## Dependencies
Depends on #N
BODY
```

If the body would exceed GitHub's limit (65 536 characters), keep the spec in the body and post
the implementation plan as numbered comments: `gh issue comment <N> --body-file -` titled
`Implementation plan (1/2)`, `(2/2)`; the body says "Implementation plan: see comments".

Then relabel: `gh issue edit <N> --remove-label status:triaged --add-label status:spec-ready`.

If an issue cannot be specified, label it `status:blocked` and comment: what is known, what
blocks it, what is needed.

### 5. Decisions

A decision that outlives the ticket (architecture, provider, data model, cross-cutting rule) gets
an ADR planned in the owning issue's "Wiki to update". The discussion stays in the issue; the ADR
page records the outcome.

### 6. Update the session plan

Adjust order in `Session plan` if contracts changed dependencies.

## Output to the user

- List of spec-ready issues in implementation order, blocked ones with reasons
- Estimated fit into remaining time (MVP vs stretch)
- Next step: run `implement-lite`
