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
# one tool per OpenAPI 3 operation (DTOs, a client in services/, tests), wired into the agent
npx gc g openapi pets --url ./pets.yaml --workflow src/my-agents/my-agents.workflow.ts --agent assistant
```

Or add it to a project and write the components yourself:

```bash
npm i graphcompose
```

```ts
// src/agents/scout.agent.ts — instructions are explicitly loaded via file()
@Agent({
  name: "scout",
  description: "Finds jobs",
  instructions: file("./scout.prompt.md"),
  model: "moonshotai/kimi-k2.6",
  price,
  tools: [GreenhouseJobs],
  promptVars: { company_name: "OpenAI" },
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
cd examples/job-scout && npm run chat # "my resume src/data/sample-resume.md"
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

## Environments

Angular-style environment files, next to the workflow file in `environments/`. The workflow itself
says nothing about them.

```ts
// src/environments/environment.ts — the contract: which fields every environment has
declare module "graphcompose" {
  interface Environment {
    readonly apiUrl: string;
    readonly apiKey: string;
    readonly currency: string;
  }
}
export {};
```

```ts
// src/environments/dev.environment.ts — one file per environment: dev, staging, test, …
import { defineEnvironment, fromEnv } from "graphcompose";

export default defineEnvironment({
  apiUrl: "https://api.example.com", // a value in the file
  apiKey: fromEnv("API_KEY", { secret: true }), // a process variable, masked when printed
  currency: fromEnv("CURRENCY", { default: "USD" }), // a process variable with a default
});
```

`defineEnvironment` is typed by `Environment`: a missing or mistyped field is a `tsc` error in that
file. Services inject the values with the framework's `ENV` token:

```ts
import { ENV, Injectable, type Environment } from "graphcompose";

@Injectable({ deps: [ENV] })
export class Api {
  constructor(private readonly env: Environment) {}
}
```

- `gc chat --workflow src/app.workflow.ts` loads `dev`; `--env staging` loads
  `staging.environment.ts` (every workflow command takes `--env`). An unknown name fails at once
  (exit 3) listing the available ones; a `fromEnv` variable without a value or default fails the
  start naming every missing variable. `gc check` validates the selected environment without
  running anything; `gc describe` shows it with secrets masked.
- From code: `createApp(Workflow, { env: "staging" })`. In tests: `testWith(Workflow, { env: "test" })`
  or `testWith(Workflow, { environment: { … } })` (typed by `Environment`).
- A service injecting `ENV` in a workflow without `environments/` fails at start with
  `[di.missing-environment]`.
- Model provider keys are not part of it: they stay process variables (`EnvironmentVariable.named`).

## Quality gates (judges)

`@Agent({ judges: [AnswerGrounded], maxRetries: 1 })` runs every judge on the agent's reply. A judge
is a `@Judge({ name, model, deps })` class implementing `JudgeHandler`; the container creates it with
its `deps`, and `ctx.model.invoke(...)` calls the judge's **own** model through the model gateway, so
its spend is in the run's cost report (`judge:<name>`, category `review`). A rejected reply goes back
to the agent with the feedback; once `maxRetries` retries are spent the run throws
`QualityGateError` (`code: "step.agent.quality-gate"`, `feedback` per judge). A judge without a model
fails at app start (`[judge.no-model]`). In tests, script the judge's model like an agent's:
`mockLlm(AnswerGrounded).thenReturn(replyWith("PASS"))`.

```ts
@Judge({ name: "answer-grounded", model: "openai/gpt-5-mini", deps: [JOB_SEARCH] })
export class AnswerGrounded implements JudgeHandler {
  constructor(private readonly search: JobSearch) {}
  async judge(reply: string, ctx: JudgeContext): Promise<JudgeVerdict> {
    const verdict = await ctx.model.invoke(
      `Does this reply cite a real job? PASS or FAIL: why\n${reply}`,
    );
    return verdict.startsWith("PASS") ? { passed: true } : { passed: false, feedback: verdict };
  }
}
```

## Run Context & Observers

GraphCompose executes all workflows with a strict **Run Context**. Inside your internal services or custom nodes, use `extractRunContext` to extract typed `runId`, `threadId`, etc.:

```ts
import { extractRunContext } from "graphcompose/graph";
const ctx = extractRunContext(config, state.runId);
console.log(ctx.runId, ctx.threadId);
```

Observers see a run's workflow, agent, router, tool, model, guardrail, policy, action, channel and
judge start/end events. Only classes listed in `@Workflow({ observers: [...] })` are called; the
container creates them at app start, with their `deps`. Each hook has its own interface and payload
type; assembly rejects an observer with no hook or with a misspelled one (`did you mean onToolEnd?`).
An observer that throws is reported as a process warning and never fails the run.

```ts
import {
  Injectable,
  Workflow,
  type AppState,
  type AgentStartEvent,
  type OnAgentStart,
  type OnWorkflowStart,
} from "graphcompose/core";

@Injectable()
export class MetricsObserver implements OnWorkflowStart, OnAgentStart {
  onWorkflowStart(state: AppState) {
    console.log(`Run ${state.runId} started`);
  }
  onAgentStart(event: AgentStartEvent) {
    console.log(`Agent ${event.name} started in run ${event.state.runId}`);
  }
}

@Workflow({ name: "support", version: "1", flow: [...], observers: [MetricsObserver] })
export class SupportWorkflow {}
```

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
