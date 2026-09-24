# WORKFLOW

How work moves from a requirement to accepted code.

## Where things live — no specs, plans or docs as files in the repo

| Kind of knowledge                                       | Place                                            |
| ------------------------------------------------------- | ------------------------------------------------ |
| Work items, discussion, **specs, implementation plans** | GitHub Issues of this repo (body + comments)     |
| **Stage of every ticket**                               | GitHub Project board of the repo, field `Status` |
| How the system works now                                | **GitHub Wiki** of this repo                     |
| Why a significant decision was made                     | Wiki pages `ADR-NNNN-Title`                      |
| Rules                                                   | `QUALITY.md`, `WORKFLOW.md`, `CLAUDE.md`         |

- Issue and PR bodies are passed to `gh` via stdin (`--body-file -`), never through files.
- The Wiki is a separate git repo; its working copy is `../<repo>.wiki`, managed by
  `scripts/wiki.sh` (`pull`, `publish`, `seed`).
- Board and stages are managed by `scripts/ticket.sh` (`setup`, `status`, `list`, `sub`).

## The conveyor

| Stage (board `Status`) | Set by                          | Means                                                                              |
| ---------------------- | ------------------------------- | ---------------------------------------------------------------------------------- |
| **Triage**             | `triage` skill                  | business side clarified: why, what it does, what it does not, constraints, success |
| **Backlog**            | `spec-session` skill            | spec, implementation plan, automated + manual acceptance criteria, test cases      |
| **In progress**        | `implement` skill (start)       | branch exists, work under way                                                      |
| **Test**               | `implement` skill (after merge) | merged to `dev`, manual acceptance instructions posted on the issue                |
| **Done**               | **a human only**                | accepted; the human also closes the issue                                          |

- Every skill moves the ticket to its own stage when it finishes.
- Triage and spec are **quiz-driven** (`.claude/skills/QUIZ.md`) and run in parallel sessions:
  every question restates the ticket, an example situation and the price of each option.
- Implementation runs independent tickets in parallel (worktrees + sub-agents, or Claude Code on
  the web), dependent ones in order.
- A ticket that cannot proceed gets the label `blocked` and a comment (what is known, what blocks,
  what is needed); its stage does not change.
- Large work: a parent issue (`type:epic`) with sub-issues (`scripts/ticket.sh sub`).

## Labels

`type:feature` · `type:bugfix` · `type:chore` · `type:epic` · `prio:mvp` · `prio:stretch` ·
`blocked`. Stages are **not** labels — they are the board `Status`.

## Branch model

```
production  ← released code
   ↑ PR
staging     ← pre-release verification
   ↑ PR
dev         ← integration branch; all work branches start and end here
   ↑ PR (squash)
<type>-<issue>
```

- Work branches are created from `dev` and merged back into `dev` via PR.
- Promotion `dev → staging → production` is a release activity, done by PR, never by the agent.
- Nobody pushes directly to `dev`, `staging`, `production`.

## Branch naming

`<type>-<issue>` — e.g. `feature-12`, `bugfix-13`, `chore-14`. Nothing else in the name.

## Commits

Conventional commits with the issue number: `feat(#12): …`, `fix(#13): …`, `test(#12): …`,
`chore(#14): …`. Small commits are fine; the PR is squash-merged.

## Pull requests

- Base: `dev`. Title: `<type>-<issue>: <issue title>`.
- Body follows `.github/pull_request_template.md` and says **`Refs #<issue>`** — never `Closes`:
  merging must not close the issue, because acceptance happens in Test.
- One PR per issue. No drive-by changes outside the issue scope — open a new issue instead.
- Merge: squash, delete branch, after `make check` / CI is green.

## Definition of Done (for the agent: ready for Test)

- [ ] All automated acceptance criteria are tests, and they pass
- [ ] `make check` green (types, lint, format, coverage ≥ 80%)
- [ ] Self-review against `QUALITY.md` done
- [ ] "Wiki to update" applied and published (ADR page if a significant decision was made)
- [ ] PR merged to `dev`; ticket moved to **Test**; handoff comment with the manual acceptance
      checklist posted on the issue

**Done** is the human's call after the manual checklist passes.
