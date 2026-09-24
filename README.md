# langgraph-ts-template

Template for building LangGraph agents in TypeScript with an LLM-driven delivery pipeline:
**triage → spec → implement**, every step visible in GitHub Issues and PRs.

## The pipeline

| Phase     | Time      | Skill            | Result                                             |
| --------- | --------- | ---------------- | -------------------------------------------------- |
| 0. Setup  | ~5 min    | —                | repo from template, stack confirmed                |
| 1. Triage | 15–20 min | `triage-lite`    | clarified requirements, 4–7 issues, `Session plan` |
| 2. Spec   | 20–25 min | `spec-lite`      | spec, plan, acceptance criteria, tests in issues   |
| 3. Build  | 60–70 min | `implement-lite` | branch + PR per issue, merged to `dev`             |
| 4. Wrap   | ~10 min   | —                | demo, summary on `Session plan`                    |

Rules: [`WORKFLOW.md`](WORKFLOW.md) (tracker, branches, PRs) ·
[`QUALITY.md`](QUALITY.md) (code, tests) · [`CLAUDE.md`](CLAUDE.md) (agent instructions).

## Start a new project from this template

```bash
gh repo create <name> --public --template <owner>/langgraph-ts-template --include-all-branches --clone
cd <name>
make setup
scripts/bootstrap-labels.sh
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
