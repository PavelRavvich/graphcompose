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
  - Everything is set in the workflow's components (`@Agent`, `@Workflow`) — reference: Wiki →
    Components, Configuration.
- Observability: `langsmith` tracing via env (`LANGSMITH_TRACING=true`). FinOps: built-in cost
  accounting, `runBudgetCap` per run and `dailyBudgetCap` per workflow (resets 00:00 UTC) (`QUALITY.md` → FinOps).
- Vitest (+ v8 coverage), ESLint (`typescript-eslint` strict), Prettier,
  `@langchain/langgraph-cli` for LangGraph Studio

## Commands

| Command (repo root)                    | What it does                                                              |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `make setup`                           | install dependencies (npm workspaces)                                     |
| `make check`                           | **the gate**: build + format + lint + typecheck + coverage, both packages |
| `npm run dev`                          | rebuild the framework on change (watch)                                   |
| `make smoke`                           | real-model smoke tests of the framework (needs `.env`), never in CI       |
| `make fmt`                             | auto-format                                                               |
| `npm run studio`                       | LangGraph Studio (graphs from `langgraph.json`)                           |
| `scripts/langfuse.sh up\|down\|status` | local Langfuse for tracing; writes keys to `.env`                         |

In `examples/job-scout/` (each is `graphcompose <command> --workflow src/job-scout.workflow.ts`):
`npm run chat` · `npm run run -- "task"` · `npm run describe` · `npm run eval` / `replay` ·
`npm run golden -- add --name <n>` · `npm run compare -- --profiles base,<p> --golden <n>` ·
`npm run rag:index` · `npm run probe -- --place <p> <token…>` (Greenhouse boards). Any run command
takes `--profile <name>` (`profiles/<workflow>/<name>.yaml`) and `--thread <id>`.

## Architecture

`START → input_guards → router ⇄ agent (→ approval, pause seam) → finalize → output_guards → END`

- `router` — graph adapter around an isolated `Router` (Jev by default) that picks the next agent
  or `finish` (answered, waiting for the user, or impossible); stops on `maxHops` or budget before
  spending. The first hop always goes to an agent.
- `agent` — the chosen agent's loop (`createAgent`): own model, prompt, tools, optional `reasoning` (quality-gated attempts judged by Jev).
- `input_guards` / `output_guards` — Jev yes/no checks; a trip returns the guard's refusal.
- `approval` — only with a pause seam: a write tool waits for a human (`resumeAgent`).
- Every turn: spend to the daily ledger, a Tern to SQLite, financials in the result, optional
  tracing (Langfuse) and conversation compaction (summaries queue).
- Components, Angular style (Wiki → Components): annotated classes, one per file, folders by kind
  (`agents/`, `tools/`, `mcp/`, `rag/`); a `@Workflow` module lists them by class reference; dependencies
  through the constructor, declared in `deps` (compiler-checked); prompts in `*.prompt.md`.
- Knowledge bases: a `@Rag` class implementing `RagConnector` in `rag/`, bound by agents with
  `rag: [{ use, mode: "tool" | "context" }]` (Wiki → Knowledge bases).
- Add a tool: a `@Tool` class in `tools/`, referenced from an agent. Add an agent: `agents/<name>.ts`
  - `<name>.prompt.md`, listed in `@Workflow`. A workflow = related agents under one directory with a
    `*.workflow.ts`; commands find it by path (`--workflow`). Test tools with `toolOf(new Tool(fakes))`.
- **Framework and examples apart** (ESLint-enforced both ways): `packages/graphcompose` never imports
  `examples/`; an example imports only `graphcompose` (its public `src/index.ts`), like an outside project.

## Conveyor

Board `Status`: **Triage → Backlog → In progress → Test → Done** (Done: human only).

| Stage              | Skill          | Output                                                                                                                     |
| ------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Triage             | `triage`       | business side (why / does / does not / constraints / acceptance criteria AC1…) in the issue; parent + sub-issues if needed |
| Backlog            | `spec-session` | spec, plan, tests + manual checks mapped to every AC, test cases in the issue                                              |
| In progress → Test | `implement`    | parallel waves; branch + PR (`Refs #N`) per issue, merged to `dev`; manual-test handoff                                    |

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
packages/graphcompose/        the framework (npm package `graphcompose`; builds to dist/, bin `graphcompose`)
  src/
    index.ts        public API (components, runAgent / resumeAgent, createAppDeps, RAG, tools, types)
    components/     @Tool @Agent @McpServer @McpTool @Rag @Injectable @Workflow, DI container, workflowOf
    workflow.ts     the assembled workflow type; app.ts — production wiring (OpenRouter, MCP, ledger, Terns, tracing)
    cli/            main.ts (graphcompose <command>), load-workflow.ts, usage, terminal helpers
    config/         typed config schema, profiles (YAML overlays), defaults resolution
    rag/            knowledge-base contract (RagConnector) + reference SQLite FTS5 connector
    graph/          state, routing, assembly, middleware, errors; nodes/ (guards, router, agent, approval, knowledge, finalize)
    llm/  routers/  tools/  guards/  terns/  run/  pause/  finops/  eval/  tracing/  prompts/  types/
    chat.ts, cli.ts, describe.ts, rag-index.ts, studio.ts   command entry points
  tests/            unit tests (helpers.ts = fakes; fixtures/ = test workflows); routers/ alone; smoke/ = real
  schema/           profile.schema.json (YAML autocomplete)
  bin/              graphcompose launcher
examples/job-scout/          the example (package job-scout-example; depends on graphcompose)
  src/              job-scout.workflow.ts, agents/ (+ *.prompt.md), tools/, fit, boards, search config, studio.ts
  tests/  profiles/  golden/
scripts/        bootstrap-repo, bootstrap-labels, ticket, wiki, langfuse, coverage-badge
../<repo>.wiki  GitHub Wiki working copy (separate git repo, never inside this repo)
```
