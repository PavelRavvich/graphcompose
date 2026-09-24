---
name: implement-lite
description: Phase 3 of the pipeline. Implements spec-ready GitHub issues one by one in plan order — branch per issue from dev, tests from the spec, green make check, self-review against QUALITY.md, PR to dev, squash merge, Wiki update, report. Use after spec-lite, or whenever the user says "implement", "start the run", "build the tickets", "go".
---

# implement-lite

Goal: ship `status:spec-ready` issues in the order of the `Session plan`, MVP first, each as its
own PR into `dev`. Run autonomously; report after every issue so an observer can follow.
The issue (body + comments) is the only source of the spec and the plan.

## Where things live — no specs, plans or docs as files in the repo

| What                                                                                  | Where                                                                | How                                                                                           |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Tickets, discussion, **specs, implementation plans**, acceptance criteria, test cases | GitHub Issues of this repo                                           | `gh issue …` — the body is passed via stdin (`--body-file -`), never via a file               |
| Current-state docs: architecture, configuration, routers, FinOps                      | **GitHub Wiki** of this repo                                         | `scripts/wiki.sh pull` → edit `../<repo>.wiki/*.md` → `scripts/wiki.sh publish "docs(#N): …"` |
| Decisions                                                                             | Wiki pages `ADR-NNNN-Title` (template: `ADR-Template`, index: `ADR`) | same as docs                                                                                  |
| Rules                                                                                 | `QUALITY.md`, `WORKFLOW.md`, `CLAUDE.md` in the repo                 | regular PR                                                                                    |

Link wiki pages from issues and PRs by URL (`https://github.com/<owner>/<repo>/wiki/Routers`),
never copy their text into files.

## Before the loop

- `git switch dev && git pull`, `scripts/wiki.sh pull`
- Note the start time. Ask the user for the time budget if not given.

## Loop — per issue

1. **Branch**
   ```bash
   git switch dev && git pull
   git switch -c <type>-<N>
   gh issue edit <N> --remove-label status:spec-ready --add-label status:in-progress
   ```
2. **Read** the issue (`gh issue view <N> --comments`) and the code it touches.
3. **Tests first**: turn every test case from the spec into a failing test.
4. **Implement** until the tests pass. Follow the implementation plan; if reality differs,
   adapt and note the deviation for the PR body.
5. **Gate**: `make check` until green.
   - Never lower thresholds, disable rules, or add ignores.
   - Same failure twice after a real fix attempt → stop, comment on the issue, label
     `status:blocked`, move to the next independent issue.
6. **Self-review** the diff (`git diff dev...HEAD`) against the checklist in `QUALITY.md`.
   If a sub-agent is available, have it review the diff and say whether a human look is needed.
7. **Commit & PR** — body via stdin, following `.github/pull_request_template.md`, with
   `Closes #<N>`:
   ```bash
   git push -u origin <type>-<N>
   gh pr create --base dev --title "<type>-<N>: <issue title>" --body-file - <<'BODY'
   ...
   BODY
   ```
8. **Merge** when CI is green:
   ```bash
   gh pr checks --watch
   gh pr merge --squash --delete-branch
   ```
9. **Wiki**: apply the issue's "Wiki to update" to `../<repo>.wiki` (pages describe `dev` after
   this merge; new ADR page + row in `ADR` if planned), then
   `scripts/wiki.sh publish "docs(#<N>): <what changed>"`.
10. **Report**: short comment on the issue (what was done, deviations, links to updated wiki
    pages, not-auto-verifiable items) and one status line to the user:
    `✓ #N <title> — PR #M merged | wiki: Routers | elapsed 00:47 | remaining 00:33 | next: #K`

## Time rules

- Finish all `prio:mvp` issues before any `prio:stretch`.
- Do not start a new issue if less than ~12 minutes remain; use the time to stabilise and
  summarise instead.

## Finish

Comment on `Session plan`: shipped, blocked (with reasons), not started, wiki pages changed, and
the list of things a human should check manually. Then show the same summary to the user.
