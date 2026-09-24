# CLAUDE.md

Multi-agent project on LangGraph + LangChain (TypeScript). Built with a three-phase pipeline:
**triage → spec → implement**. Code is the only source of truth; tickets hold the reasoning.

## Stack

- Node 22+, TypeScript (strict, fully typed — see `QUALITY.md` → Types), ESM
- `@langchain/langgraph` (graph), `@langchain/core` (messages, prompts, tools, test fakes),
  `langchain` (`createAgent` for tool-using agents), `zod`
- LLM access: **OpenRouter** only. Env: `OPENROUTER_API_KEY` (+ optional `OPENROUTER_BASE_URL`).
  - Routers: default model **Jev** (`defaults.router`, Decisions API — probabilities, exact
    cost); any router can override its model in config (e.g. `kind: "llm"`).
  - Agents: cheap chat models (default `moonshotai/kimi-k2.6`) via `@langchain/openai`, each with
    `maxTokens` (`MODEL_MAX` = model's maximum), `thinking`, `cache`.
  - Everything is set in `src/config/agents.config.ts` — reference: Wiki → Configuration.
- Observability: `langsmith` tracing via env (`LANGSMITH_TRACING=true`). FinOps: built-in cost
  accounting, `runBudgetCap` per run and `dailyBudgetCap` per agent bundle (resets 00:00 UTC) (`QUALITY.md` → FinOps).
- Vitest (+ v8 coverage), ESLint (`typescript-eslint` strict), Prettier,
  `@langchain/langgraph-cli` for LangGraph Studio

## Commands

| Command                | What it does                                       |
| ---------------------- | -------------------------------------------------- |
| `make setup`           | install dependencies                               |
| `make check`           | **the gate**: typecheck + lint + format + coverage |
| `make test`            | unit tests only (fake models, $0)                  |
| `npm run test:routers` | router tests only — routers are isolated           |
| `make smoke`           | real-model smoke tests (needs `.env`), never in CI |
| `make fmt`             | auto-format                                        |
| `npm start -- "task"`  | run the graph; prints answer, route and cost       |
| `npm run studio`       | LangGraph Studio with the graph (needs `.env`)     |

A ticket is not done until `make check` is green.

## Architecture

`START → router ⇄ agent → finalize → END`

- `router` — graph adapter around an isolated `Router` (Jev by default) that picks the next agent
  or `finish`; stops on `maxHops` or budget before spending. A failed decision ends the run.
- `agent` — runs the chosen agent with its own model and prompt; appends a contribution.
- `finalize` — answer = latest contribution.
- Add an agent: entry in `agents.config.ts` + prompt in `src/prompts/agents.ts`. Nothing else.

## Conveyor

Board `Status`: **Triage → Backlog → In progress → Test → Done** (Done: human only).

| Stage              | Skill          | Output                                                                                                    |
| ------------------ | -------------- | --------------------------------------------------------------------------------------------------------- |
| Triage             | `triage`       | business side (why / does / does not / constraints / success) in the issue; parent + sub-issues if needed |
| Backlog            | `spec-session` | spec, plan, automated + manual acceptance criteria, test cases in the issue                               |
| In progress → Test | `implement`    | parallel waves; branch + PR (`Refs #N`) per issue, merged to `dev`; manual-test handoff                   |

Quizzes: `.claude/skills/QUIZ.md`. Stages: `scripts/ticket.sh status <N> <Status>`.

## Hard rules

- Read `WORKFLOW.md` (tracker, wiki, branches, PRs) and `QUALITY.md` (code, types, agents, FinOps,
  tests) before writing code.
- Tracker is GitHub Issues via `gh`. Every change belongs to an issue.
- Never commit to `dev`, `staging` or `production` directly. Branch from `dev`: `<type>-<issue>`.
- Every domain concept gets a named type; reusable code is generic.
- Every model call records usage; models come only from the registry.
- Never lower coverage thresholds, disable lint rules, or add `eslint-disable` / `@ts-ignore`
  to get green. Fix the code or stop and report.
- Tests never call a real LLM. Use fakes from `@langchain/core/utils/testing`.
- Read existing code before planning — the spec may be stale, the code is not.
- **No specs, plans or docs as files.** Specs and implementation plans → GitHub Issues (bodies via
  stdin). Docs → GitHub Wiki via `scripts/wiki.sh`, updated right after the merge; decisions →
  wiki pages `ADR-NNNN-Title`.
- Routers never import graph/agents/prompts; import routers only via `src/routers/index.ts`.
- Screenshots and scratch output go to `.artifacts/` (git-ignored).

## Layout

```
src/
  config/       agents.config.ts (agents, models, prices, budget) + typed schema
  graph/        state, routing, graph assembly, node types; nodes/ (router, agent, finalize)
  llm/          OpenRouter chat factory (thinking), Jev client, cache breakpoints, registry
  routers/      isolated routing strategies (Jev, LLM); public API = routers/index.ts
  finops/       usage records, cost, reports
  prompts/      router + per-agent prompt templates
  types/        shared type utilities (Brand)
  app.ts        production wiring (config + OpenRouter + prompts)
  index.ts      runAgent(): answer, route, stop reason, cost
  cli.ts, studio.ts   entry points
tests/          unit tests (helpers.ts = fakes); tests/routers/ = routers alone; tests/smoke/ = real
scripts/        bootstrap-repo, bootstrap-labels, wiki (pull / publish / seed)
../<repo>.wiki  GitHub Wiki working copy (separate git repo, never inside this repo)
```
