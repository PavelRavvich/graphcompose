# CLAUDE.md

Multi-agent project on LangGraph + LangChain (TypeScript). Built with a three-phase pipeline:
**triage → spec → implement**. Code is the only source of truth; tickets hold the reasoning.

## Stack

- Node 22+, TypeScript (strict, fully typed — see `QUALITY.md` → Types), ESM
- `@langchain/langgraph` (graph, and each agent's own loop as a subgraph), `@langchain/core`
  (messages, prompts, tools, test fakes), `zod` (inside the framework only — workflows use DTO
  classes, `graphcompose/dto`)
- LLM access: **OpenRouter** only. Env: `OPENROUTER_API_KEY` (+ optional `OPENROUTER_BASE_URL`).
  - Routers: each `@Router` names its own `model` — **Jev** (`typesafe/jev-*`, Decisions API —
    probabilities, exact cost) or any chat model. Guards use `defaults.router` (Jev).
  - Agents: cheap chat models (default `moonshotai/kimi-k2.6`) via `@langchain/openai`, each with
    `maxTokens` (`MODEL_MAX` = model's maximum), `thinking`, `cache`.
  - Everything is set in the workflow's components (`@Workflow` with its `flow` and `settings()`,
    `@Router`, `@Agent`) — reference: Wiki → Workflow, Routers, Components, Configuration.
- Observability: `langsmith` tracing via env (`LANGSMITH_TRACING=true`). FinOps: built-in cost
  accounting; limits in the workflow's `settings().limits(...)` — per run (steps, cost) and per day
  (cost, resets 00:00 UTC); hitting any limit fails the run (`QUALITY.md` → FinOps).
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

**The workflow file is the graph** (Wiki → Workflow): `@Workflow({ flow: [...] })` lists the
transitions with a small DSL from `graphcompose/graph`, checked at assembly and built into LangGraph.
job-scout is a star:

```ts
flow: [
  from(ChatWorkflowStart).to(MainRouter),
  from(MainRouter).choose(Profiler, Scout, Shortlist, ChatWorkflowFinish),
  from(Profiler, Scout, Shortlist).to(MainRouter),
],
```

- DSL: `from(A, B).to(C)` (unconditional, several sources = fan-in), `from(Router).choose(X, Y)`
  (the router picks one), `chain(A, B, C)` (a straight line; a router only last), `node(Class, "name")`
  (a second place for a class, declared once as a constant), `Self` (back to the node the router was
  called after).
- Node kinds: `@WorkflowStart` (where a run starts: input DTO, runs the input guards), `@Router`
  (picks the next node), `@Agent` (its loop), `@WorkflowFinish` (where a run finishes: output DTO,
  the last answer, runs the output guards). A start and a finish may share a name (`chat` / `chat`);
  LangGraph node ids are `<kind>.<name>` (`workflow-start.chat`).
  `@WorkflowPause` (#117) completes the trio.
- **Assembly rules** fail at assembly, before any model call, with **all** violations at once
  (`GraphRuleError`, stable codes `graph.*` / `router.*`): every node is a decorated class, one next
  step per node, `choose` only from a router, a cycle needs a router, a workflow start exists, no
  unreachable node or dead end, nothing after a workflow finish, a router's `routes` equal its `choose(...)`.
- `@Router` (Wiki → Routers): `instructions` says **how** to choose; `routes` array uses `route().to()` to define conditions
  each choice means (`route(Profiler, "Reading the resume …")`) — route text is required; a route
  **to a workflow finish** is worded as a stop instruction ("Stop and send the answer: …"), never as "the
  answer is ready". `maxVisits` bounds visits of one router. A router that fails or picks an unknown
  route **fails the run** (`RouterDecisionError`) — no guessing.
- `@Agent` — the agent's own loop (#150, `src/graph/agent-loop/`, a compiled subgraph): own model,
  prompt, tools; every finished tool call stored by `callId` (a crash re-runs only an unfinished
  call — `ToolContext.callId` is the idempotency key); limits per call `modelCalls` 12 /
  `toolCalls` 20 (`maxToolCalls`); `approval` — only with a pause seam: a write tool waits for a
  decision, one call per pause (`resumeAgent`).
- Guards — Jev yes/no checks; an input guard trip ends the run at the workflow start with the
  guard's refusal, an output guard checks the answer at the workflow finish.
- **Limits** in `settings()`: `WorkflowSettings.builder().limits({ perRun, perDay }).build()`,
  e.g. `perRun: { steps: 12, cost: usd(0.1) }`, `perDay: { cost: usd(1) }`. Steps = visits of
  agents and routers (default (agents + routers) × 3). Hitting any limit **fails the run** with
  `LimitExceededError` naming the boundary key (`limits.perRun.steps`, `limits.perRun.cost`,
  `limits.perDay.cost`, `routers.<name>.maxVisits`). LangGraph `recursionLimit` is only a safety
  net far above the steps.
- Every turn: spend to the daily ledger, a Tern to SQLite, financials in the result, optional
  tracing (Langfuse) and conversation compaction (summaries queue).
- Components, Angular style (Wiki → Components): annotated classes, one per file, folders by kind
  (`workflow-starts/`, `routers/`, `agents/`, `workflow-finishes/`, `tools/`, `mcp/`, `rag/`, `services/`); the
  `@Workflow` module places nodes in its `flow` and lists `mcp` servers and `providers` by class
  reference; dependencies through the constructor, declared in `deps` (compiler-checked); instructions via `file("./*.prompt.md")`. `@Injectable` services stay until #121 renames them.
- **Data are DTO classes** (`graphcompose/dto`, Wiki → Standard DTOs): one field decorator per field
  (`@Text`, `@Integer`, `@Flag`, `@OneOf`, `@ListOf`, `@Nested`, …), plain data, no methods. Tool
  `input` / `output`, MCP server tools (`tools: { name: { input, output } }`), workflow start
  inputs and workflow finish outputs are DTOs; standard ones (`WorkflowStartText`,
  `WorkflowFinishText`, `ToolCallApprovalDecision`, `RagSearchResult`, `PlainText`, …) come from the
  framework.
  zod lives only inside the framework (external input it parses is still validated there).
- Knowledge bases: a `@Rag` class implementing `RagConnector` in `rag/`, bound by agents with
  `rag: [{ use, mode: "tool" | "context" }]` (Wiki → Knowledge bases).
- Add a tool: a `@Tool` class in `tools/` with `input` / `output` DTOs in `*.dto.ts`, referenced
  from an agent. Add an agent: `agents/<name>.agent.ts` and use `file("./<name>.prompt.md")`, placed in the `flow`
  and in its router's `choose(...)` and `routes`. A workflow = its components under one directory
  with a `*.workflow.ts`; commands find it by path (`--workflow`). Test tools with
  `toolOf(new Tool(fakes))`.
- **Component rules** (Wiki → Components): decorator = metadata (one option per line), constructor =
  dependencies (`private readonly`, one per line), methods = a contract — `implements` for your own
  (`ToolHandler<In, Out>`, `RagConnector`), `extends` + `override` for a standard implementation
  (`SqliteFtsConnector`, `McpServerClient`); services do I/O, helpers are pure. An `@McpTool` is a
  tool with its `*.server.ts` server injected.
- **File conventions** (Wiki → Components): `*.workflow-start.ts`, `*.router.ts`,
  `*.workflow-finish.ts`,
  `*.agent.ts` with explicit `instructions: file()`, `*.tool.ts` + `*.tool.test.ts`, `*.dto.ts`,
  `*.server.ts` + `*.mcp.ts`, `*.rag.ts`, `*.service.ts` (`@Injectable`), `*.helper.ts`; tools keep
  `run`, bulky helpers go to `*.helper.ts`.
- **Framework and examples apart** (ESLint-enforced both ways): `packages/graphcompose` never imports
  `examples/`; an example imports only the public `graphcompose` entry points (`graphcompose`,
  `graphcompose/graph`, `graphcompose/dto`, `graphcompose/units`), like an outside project.

## Naming grammar (#127)

Names repeat the same patterns everywhere, so one name lets you guess the others (Wiki →
Components):

- **Kind as the suffix, qualifier in front**: `MainRouter`, `CoderAgent`, `ChatWorkflowFinish`.
  DTOs are the exception: noun pairs from one root (`FileRead` → `FileContent`, `FileWrite` →
  `FileWritten`); a DTO that belongs to a component kind starts with that kind.
- **Hierarchy rule (#141)**: a DTO that belongs to a component kind starts with that kind
  (`WorkflowStartText`, `ToolCallApprovalDecision`, `RagSearchResult`); paired concepts get paired
  names (`@WorkflowStart` / `@WorkflowFinish`, `WorkflowPauseQuestion` / `WorkflowPauseAnswer`);
  nothing "chat", "user", "human" or "person" in framework names — a run may be a CI pipeline, an
  approval may come from a system. `scripts/check-old-names.sh` (in `make check`) keeps the retired
  names out.
- **When + what** for things tied to a moment: `BeforeToolCallJudge`, `AfterToolCallJudge`,
  `BeforeAgentAnswerJudge`.
- **One limit → flat `max…`** (`maxVisits`); **several related → an object** named by what they
  are, the scope stated once (`limits: { perRun: { steps, cost } }`).
- **Closed sets are enums**, not string unions, in the public API.
- **One field name per meaning** across variants (`reason` for every verdict).
- **Full words.** Kept abbreviations: DTO, PII, MCP, RAG, JSON, CSV, CLI, URL, ID, API and the
  command `gc`.
- Getting something for a component is `…Of` (`schemaOf`, `modelOf`); attaching is
  `<verb>(what).on(target)`; storage contracts are `…Repository` with Spring Data method names.
- **Values with units** — `usd(0.5)`, `seconds(30)`, `minutes(5)` (`graphcompose/units`), no `Ms` /
  `Usd` in names. `override…` only for replacing what is inherited.

## Conveyor

Board `Status`: **Triage → Backlog → In progress → Test → Done** (Done: human only).

| Stage              | Skill          | Output                                                                                                                     |
| ------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Triage             | `triage`       | business side (why / does / does not / constraints / acceptance criteria AC1…) in the issue; parent + sub-issues if needed |
| Backlog            | `spec-session` | spec, plan, tests + manual checks mapped to every AC, test cases in the issue                                              |
| In progress → Test | `implement`    | parallel waves; branch + PR (`Refs #N`) per issue, merged to `dev`; manual-test handoff                                    |

Quizzes: `.claude/skills/QUIZ.md`. Stages: `scripts/ticket.sh status <N> <Status>`.

## Component Validation & Context (Epic #177)

- **Strict DI injection:** One `deps` contract for every component kind (`@Tool`, `@McpTool`, `@Injectable`, `@Rag`, `@WorkflowAction`, `@Guardrail`, `@PiiPolicy`, `@Channel`, inbound adapters, `@Judge`): `deps` are checked against the constructor by the compiler and injected by the container. A dependency without a provider fails at assembly (`Consumer: "TOKEN" is not registered …`). Every class in `providers` must carry a decorator (`@Injectable({ deps })` or its component decorator), else assembly fails with `[di.undecorated-provider]`; values go through `provide(token, value)` — a raw `{ provide, useValue }` literal does not compile.
- **Tool names:** unique over the names a model sees — local, MCP and `search_<rag>` — else `[tool.duplicate-name]` at assembly.
- **Channel constraints:** If an `@McpTool` or `@Tool` specifies a `channel`, that channel class MUST be explicitly registered in the `@Workflow({ channelClasses: [...] })` array. Otherwise, compilation throws `ComponentError`.
- **Environment variables:** Use `environmentToken<T>()` from `graphcompose/core` to define a typed DI token. Do not rely on `process.env` directly in services. Pass the environment object in `createApp(Workflow, { env: environment })`. Create `environments/environment.ts` (Angular style) to export the environment interface and the object itself.
- **RunContext:** Do not manually parse `config?.configurable?.run_id` in LangGraph nodes. Use `extractRunContext(config, fallbackRunId)` to get a strictly typed `RunContext` object with `runId`, `threadId`, etc.

## Hard rules

- Read `WORKFLOW.md` (tracker, wiki, branches, PRs) and `QUALITY.md` (code, types, agents, FinOps,
  tests) before writing code.
- Tracker is GitHub Issues via `gh`. Every change belongs to an issue.
- Never commit to `dev`, `staging` or `production` directly. Branch from `dev`: `<type>-<issue>`.
- Every domain concept gets a named type; reusable code is generic.
- Every model call records usage; models come only from the registry.
- Never lower coverage thresholds, disable lint rules, or add `eslint-disable` / `@ts-ignore`
  to get green. Fix the code or stop and report.
- The gate enforces it (#180): `.suppressions.json` is a budget of every `eslint-disable`,
  `@ts-ignore`, `as any` and `as unknown as` — `make check` fails when a count goes up, and when it
  goes down until the budget is lowered (`node scripts/check-suppressions.mjs --write`). No
  file-scope `/* eslint-disable */`, ever. Tests must assert (`requireAssertions`) and must not fake
  framework failures (e.g. an interrupt by its name). The repo root is allow-listed
  (`.root-allowlist`): notes and specs go to Issues / Wiki.
- Tests never call a real LLM. A workflow is tested with `graphcompose/testing` (`testWith`: models
  by script, MCP servers stubbed, network blocked); units use fakes from `@langchain/core/utils/testing`.
- Read existing code before planning — the spec may be stale, the code is not.
- **No specs, plans or docs as files.** Specs and implementation plans → GitHub Issues (bodies via
  stdin). Docs → GitHub Wiki via `scripts/wiki.sh`. **ALWAYS update the `../<repo>.wiki` repository directly whenever making API, DSL, or architectural changes so that the wiki is always up-to-date.** Decisions → wiki pages `ADR-NNNN-Title`.
- Routers never import graph/agents/prompts; import routers only via `src/routers/index.ts`.
- **Example code before spec**: a new decorator or a new parameter enters a spec only after example
  code using it is agreed.
- New names follow the naming grammar (above, #127).
- Screenshots and scratch output go to `.artifacts/` (git-ignored).

## Layout

```
packages/graphcompose/        the framework (npm package `graphcompose`; builds to dist/, bin `graphcompose`)
  src/
    index.ts        public API (components, createApp, runAgent / resumeAgent, createAppDeps, RAG, tools, types)
    app/            createApp → app.execute / resume / close; app-deps.ts — production wiring (model gateway,
                    MCP, ledger, Terns, tracing), every part replaceable
    testing/        `graphcompose/testing`: testWith (Vitest fixtures), scripted gateway, matchers, setup.ts
    components/     @Tool @Agent @McpServer @McpTool @Rag @Injectable @Workflow, DI container, workflowOf
    dto/            `graphcompose/dto`: field decorators, DTO schemas and validation, standard/ DTOs
    units/          `graphcompose/units`: usd(), seconds(), minutes()
    workflow.ts     the assembled workflow type
    cli/            main.ts → run-cli.ts (argv → exit code 0/1/2 usage/3 project/4 conflict, --json
                    envelope), commands.ts (one option schema per command: parser + help), terminal helpers
    config/         typed config schema, profiles (YAML overlays), defaults resolution
    rag/            knowledge-base contract (RagConnector) + reference SQLite FTS5 connector
    graph/          `graphcompose/graph`: flow.ts (DSL), route.ts, workflow-start / router / workflow-finish decorators,
                    rules.ts + check-flow.ts + router-rules.ts (assembly rules, rule-error.ts), build.ts
                    (LangGraph), limits.ts, settings.ts, flow-state.ts, visit.ts; nodes/ (flow-router,
                    agent loop, approval, guards, knowledge, finalize)
    llm/  routers/  tools/  guards/  terns/  run/  pause/  finops/  eval/  tracing/  prompts/  types/
    chat.ts, cli.ts, describe.ts, rag-index.ts, studio.ts   command entry points
  tests/            unit tests (helpers.ts = fakes; fixtures/ = test workflows); routers/ alone; smoke/ = real
  schema/           profile.schema.json (YAML autocomplete)
  bin/              graphcompose launcher
examples/job-scout/          the example (package job-scout-example; depends on graphcompose)
  src/              job-scout.workflow.ts, studio.ts; workflow-starts/ (*.workflow-start.ts), routers/
                    (*.router.ts), agents/ (*.agent.ts using file()), workflow-finishes/
                    (*.workflow-finish.ts), tools/ (*.tool.ts +
                    *.dto.ts), services/ (*.service.ts), mcp/ (*.server.ts, *.mcp.ts, *.dto.ts),
                    rag/ (*.rag.ts), helpers/ (*.helper.ts), config/, scripts/, data/
  tests/  profiles/  golden/
scripts/        bootstrap-repo, bootstrap-labels, ticket, wiki, langfuse, coverage-badge, check-rules-files
../<repo>.wiki  GitHub Wiki working copy (separate git repo, never inside this repo)
```
