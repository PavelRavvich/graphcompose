# WORKFLOW

How work moves from requirement to merged code.

## Where things live — no specs, plans or docs as files in the repo

| Kind of knowledge                                       | Place                                        |
| ------------------------------------------------------- | -------------------------------------------- |
| Work items, discussion, **specs, implementation plans** | GitHub Issues of this repo (body + comments) |
| How the system works now                                | **GitHub Wiki** of this repo                 |
| Why a significant decision was made                     | Wiki pages `ADR-NNNN-Title`                  |
| Rules                                                   | `QUALITY.md`, `WORKFLOW.md`, `CLAUDE.md`     |

- Issue and PR bodies are passed to `gh` via stdin (`--body-file -`), never through files.
- The Wiki is a separate git repo; its working copy is `../<repo>.wiki`, managed by
  `scripts/wiki.sh` (`pull`, `publish`, `seed`). It describes `dev` and is updated right after the
  PR that changes the described behaviour is merged.
- Issues link to wiki pages by URL; wiki pages link to issues (`#N`) for history.

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
- Promotion `dev → staging → production` is a release activity, done by PR, never by the agent
  during a session.
- Nobody pushes directly to `dev`, `staging`, `production`.

## Ticket types and labels

| Label                | Meaning                                 |
| -------------------- | --------------------------------------- |
| `type:feature`       | new behaviour                           |
| `type:bugfix`        | wrong behaviour fixed                   |
| `type:chore`         | tooling, config, refactor, no behaviour |
| `prio:mvp`           | must ship in this session               |
| `prio:stretch`       | only if time is left                    |
| `status:triaged`     | created by triage, no spec yet          |
| `status:spec-ready`  | spec complete, can be implemented       |
| `status:in-progress` | branch exists                           |
| `status:blocked`     | cannot proceed — reason in a comment    |

Create them once with `scripts/bootstrap-labels.sh`.

Dependencies are written in the issue body as `Depends on #N`.

## Branch naming

`<type>-<issue>` — e.g. `feature-12`, `bugfix-13`, `chore-14`. Nothing else in the name.

## Commits

Conventional commits with the issue number:

```
feat(#12): add routing node for tool calls
fix(#13): handle empty model response
test(#12): cover routing edge cases
chore(#14): configure CI cache
```

Small commits are fine; the PR is squash-merged.

## Pull requests

- Base: `dev`. Title: `<type>-<issue>: <issue title>`.
- Body follows `.github/pull_request_template.md` and contains `Closes #<issue>`.
- One PR per issue. No drive-by changes outside the issue scope — open a new issue instead.
- Merge: squash, delete branch, after `make check` / CI is green.

## Definition of Done

- [ ] All acceptance criteria from the issue are met
- [ ] Every test case from the spec exists as a test
- [ ] `make check` green (types, lint, format, coverage ≥ 80%)
- [ ] Self-review against `QUALITY.md` done
- [ ] "Wiki to update" applied and published (ADR page if a significant decision was made)
- [ ] "Not auto-verifiable" items listed in the PR body
- [ ] PR merged to `dev`, issue closed, short report comment on the issue

## Ticket lifecycle

`triaged → spec-ready → in-progress → closed` (or `blocked` at any point, with a comment:
what was found, what blocks it, what is needed to continue).
