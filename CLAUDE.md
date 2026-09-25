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

| Command                                           | What it does                                                      |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| `make setup`                                      | install dependencies                                              |
| `make check`                                      | **the gate**: typecheck + lint + format + coverage                |
| `make test`                                       | unit tests only (fake models, $0)                                 |
| `npm run test:routers`                            | router tests only — routers are isolated                          |
| `make smoke`                                      | real-model smoke tests (needs `.env`), never in CI                |
| `make fmt`                                        | auto-format                                                       |
| `npm run chat -- [--config <bundle>]`             | interactive chat: thread, cost trace, Esc interrupts, `\` newline |
| `npm start -- [--config <bundle>] "task"`         | one turn; `--thread <id>` continues a conversation                |
| `npm run studio`                                  | LangGraph Studio (graphs from `langgraph.json`)                   |
| `npm run eval` / `npm run replay`                 | score Terns with Jev / re-run a prompt version (`--config`)       |
| `scripts/langfuse.sh up\|down\|status`            | local Langfuse for tracing; writes keys to `.env`                 |
| `npm run job-scout:probe -- --place <p> <token…>` | which Greenhouse boards have jobs in a place (demo)               |

Bundles: `default` (the project's agents) and the demos `company-assistant`,
`company-assistant-approval`, `job-scout` (Wiki → Demos).

A ticket is not done until `make check` is green.

## Architecture

`START → input_guards → router ⇄ agent (→ approval, pause seam) → finalize → output_guards → END`

- `router` — graph adapter around an isolated `Router` (Jev by default) that picks the next agent
  or `finish` (answered, waiting for the user, or impossible); stops on `maxHops` or budget before
  spending. The first hop always goes to an agent.
- `agent` — the chosen agent's loop (`createAgent`): own model, prompt, tools, optional `review`.
- `input_guards` / `output_guards` — Jev yes/no checks; a trip returns the guard's refusal.
- `approval` — only with a pause seam: a write tool waits for a human (`resumeAgent`).
- Every turn: spend to the daily ledger, a Tern to SQLite, financials in the result, optional
  tracing (Langfuse).
- Add an agent: entry in `agents.config.ts` + prompt in `src/prompts/agents.ts`. Nothing else.
- Another set of agents: a bundle (`src/bundle.ts`) registered in `src/bundles.ts`.

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
  config/       agents.config.ts (agents, models, prices, budget, guards) + typed schema
  graph/        state, routing, assembly, middleware, errors; nodes/ (guards, router, agent, approval, finalize)
  llm/          OpenRouter chat factory (thinking), Jev client, cache breakpoints, registry
  routers/      isolated routing strategies (Jev, LLM); public API = routers/index.ts
  tools/        typed tools, registry, MCP facades, LangChain adapter; public API = tools/index.ts
  guards/       input / output guards on routers
  terns/        run records, threads, scores in SQLite (isolated)
  run/          runAgent / resumeAgent: threads, budget, Terns, financials, tracing, pause
  pause/        the pause seam (approval before write tools)
  finops/       usage records, cost report, daily ledger
  eval/         Jev judge, eval and replay CLIs
  tracing/      optional run tracing (self-hosted Langfuse)
  prompts/      agent, routing, guard and review texts
  cli/          terminal helpers: approval, keys, multi-line input, spinner, cost output
  demos/        demo bundles (company-assistant, job-scout) — removable
  types/        shared type utilities (Brand)
  bundle.ts, bundles.ts   agent bundles and the --config registry
  app.ts        production wiring of a bundle (OpenRouter, MCP, ledger, Terns, tracing)
  index.ts      public API: runAgent, resumeAgent, types
  cli.ts, chat.ts, studio.ts   entry points
tests/          unit tests (helpers.ts = fakes); tests/routers/ = routers alone; tests/smoke/ = real
scripts/        bootstrap-repo, bootstrap-labels, ticket, wiki, langfuse, coverage-badge
../<repo>.wiki  GitHub Wiki working copy (separate git repo, never inside this repo)
```
