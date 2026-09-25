# GraphCompose

[![CI](https://github.com/PavelRavvich/graphcompose/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/PavelRavvich/graphcompose/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/PavelRavvich/graphcompose/badges/coverage.json)](https://github.com/PavelRavvich/graphcompose/actions/workflows/ci.yml)

Typed agent workflows on LangGraph, in TypeScript. Agents, tools, MCP servers and knowledge bases
are **Angular-style components** — annotated classes, wired by a `@Workflow` module, dependencies
through the constructor, every link checked by the compiler. Routing by Jev (cheap, exact cost),
FinOps on every call, Terns and evaluation, profiles and comparisons, tracing.

## Use it

```bash
npx gc create my-agents   # alias gc c — a working project from a short questionnaire
cd my-agents && cp .env.example .env && npm run chat
npx gc g tool refund --workflow src/my-agents/my-agents.workflow.ts --agent assistant
```

Or add it to a project and write the components yourself:

```bash
npm i graphcompose
```

```ts
// src/agents/scout.ts
@Agent({
  name: "scout",
  description: "Finds jobs",
  model: "moonshotai/kimi-k2.6",
  price,
  tools: [GreenhouseJobs],
  prompt: new URL("./scout.prompt.md", import.meta.url),
})
export class Scout {}

// src/job-scout.workflow.ts
@Workflow({
  name: "job-scout",
  version: "1.0.0",
  defaults,
  budget,
  routers,
  agents: [Profiler, Scout],
  providers: [JobFitJudge],
})
export class JobScout {}
```

```bash
npx graphcompose chat --workflow src/job-scout.workflow.ts
npx graphcompose describe --workflow src/job-scout.workflow.ts   # agents, tools, dependencies — no API key
npx graphcompose --help                                          # run, eval, replay, golden, compare, rag:index
```

Needs `OPENROUTER_API_KEY` in `.env`. Docs: [Wiki → Components](https://github.com/PavelRavvich/graphcompose/wiki/Components) ·
[Configuration](https://github.com/PavelRavvich/graphcompose/wiki/Configuration) · [Knowledge bases](https://github.com/PavelRavvich/graphcompose/wiki/Knowledge-bases) ·
[Profiles and comparisons](https://github.com/PavelRavvich/graphcompose/wiki/Profiles-and-comparisons).

## The example

[`examples/job-scout`](examples/job-scout) — resume → proposed search brief → Greenhouse jobs ranked
by Jev. It depends on `graphcompose` exactly like your project would:

```bash
npm install && npm run build          # at the repo root
cd examples/job-scout && npm run chat # "my resume src/sample-resume.md"
```

More: [Wiki → Example](https://github.com/PavelRavvich/graphcompose/wiki/Example).

## Repository

```
packages/graphcompose/   the framework (published as `graphcompose`)
examples/job-scout/     the example (uses only the public API)
```

`make check` — build, format, lint, types, tests with coverage for both packages. `npm run dev` —
rebuild the framework on change. The framework never imports the examples, and the examples use
only `graphcompose` — both enforced by ESLint.

## Tracing (local, optional)

```bash
scripts/langfuse.sh up   # self-hosted Langfuse in Docker, keys written to .env
```

Then every run is traced at http://localhost:3000. Details: [Wiki → Tracing](https://github.com/PavelRavvich/graphcompose/wiki/Tracing).

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

Rules and the delivery pipeline: [`WORKFLOW.md`](WORKFLOW.md) · [`QUALITY.md`](QUALITY.md) ·
[`CLAUDE.md`](CLAUDE.md). Specs and plans live in GitHub Issues, docs in the GitHub Wiki.
