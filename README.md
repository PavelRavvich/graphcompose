# langgraph-ts-template

[![CI](https://github.com/PavelRavvich/langgraph-ts-template/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/PavelRavvich/langgraph-ts-template/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/PavelRavvich/langgraph-ts-template/badges/coverage.json)](https://github.com/PavelRavvich/langgraph-ts-template/actions/workflows/ci.yml)

Template for building LangGraph agents in TypeScript with an LLM-driven delivery pipeline:
**triage → spec → implement**, every step visible in GitHub Issues and PRs.

## The conveyor

Tickets move across the GitHub Project board of the repo:

| Stage              | Skill          | Result                                                                                                |
| ------------------ | -------------- | ----------------------------------------------------------------------------------------------------- |
| Triage             | `triage`       | business side clarified through quizzes; issue(s) created or updated, split into sub-issues if needed |
| Backlog            | `spec-session` | spec, implementation plan, automated + manual acceptance criteria — in the issue                      |
| In progress → Test | `implement`    | independent issues in parallel; branch + PR per issue, merged to `dev`; manual-test handoff           |
| Done               | a human        | after manual acceptance                                                                               |

Rules: [`WORKFLOW.md`](WORKFLOW.md) (conveyor, board, branches, PRs) ·
[`QUALITY.md`](QUALITY.md) (code, tests) · [`CLAUDE.md`](CLAUDE.md) (agent instructions).

## Start a new project from this template

```bash
gh repo create <name> --public --template <owner>/langgraph-ts-template --include-all-branches --clone
cd <name>
make setup
scripts/bootstrap-labels.sh
scripts/ticket.sh setup   # the board: Triage → Backlog → In progress → Test → Done
gh repo edit --enable-wiki --enable-issues
# GitHub creates the wiki repo only after the first page is saved once in the UI:
#   open https://github.com/<owner>/<name>/wiki/_new, save any page, then:
scripts/wiki.sh seed <owner>/langgraph-ts-template
cp .env.example .env   # OPENROUTER_API_KEY — for npm start / make smoke
make check             # must be green before the first ticket
```

Specs and implementation plans live in GitHub Issues, docs in the GitHub Wiki — nothing of that
is stored as files in the repo.

## Commands

```bash
make check                 # typecheck + lint + format + tests with coverage ≥ 80%
make test                  # unit tests (fake models, no network, $0)
make smoke                 # real-model smoke test (needs .env)
npm start -- "task"        # run the graph: answer + route + cost report
npm run studio             # LangGraph Studio
```

## Skeleton

`START → router ⇄ agent → finalize → END`. A config-driven multi-agent graph: a Jev router
(TypeSafe decision model, LLM fallback via config) picks specialist agents on cheap Kimi models (each with its own model and prompt) until the task is
done, `maxHops` is reached or the per-run budget is spent. All models go through OpenRouter.
Every call is cost-accounted; each run returns a cost report.

Add an agent: one entry in `src/config/agents.config.ts` + one prompt in
`src/prompts/agents.ts`.
