# GraphCompose

[![CI](https://github.com/PavelRavvich/graphcompose/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/PavelRavvich/graphcompose/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/PavelRavvich/graphcompose/badges/coverage.json)](https://github.com/PavelRavvich/graphcompose/actions/workflows/ci.yml)

Typed agent workflows on LangGraph, in TypeScript. Agents, tools, MCP servers and knowledge bases
are **Angular-style components** — annotated classes, wired by a `@Workflow` module, dependencies
through the constructor, every link checked by the compiler. Routing and judging by decision models
(Jev, GPT-6 Luna Decisions, … — calibrated, exact cost),
FinOps on every call, Terns and evaluation, profiles and comparisons, tracing.

## Use it

```bash
npx gc create my-agents   # alias gc c — a working project from a short questionnaire
cd my-agents && cp .env.example .env && npm run chat
npx gc g tool refund --workflow src/my-agents/my-agents.workflow.ts --agent assistant
# one tool per OpenAPI 3 operation (DTOs, a client in services/, tests), wired into the agent
npx gc g openapi pets --url ./pets.yaml --workflow src/my-agents/my-agents.workflow.ts --agent assistant
# any layout: targets come from the workflow module, tests go where vitest looks, files are
# prettier-formatted; a rerun refuses — --force regenerates the files and keeps existing wiring
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
its `deps`, and its **own** model is called through the model gateway, so its spend is in the run's
cost report (`judge:<name>`, category `review`). A rejected reply goes back to the agent with the
feedback; once `maxRetries` retries are spent the run throws `QualityGateError`
(`code: "step.agent.quality-gate"`, `feedback` per judge). A judge without a model fails at app start
(`[judge.no-model]`).

The judge's model is a chat model (`ctx.model.invoke(...)`) or a **decision model**
(`ctx.model.decide({ state, questions })`) — every model of OpenRouter's Decisions API:
`typesafe/jev-1.13`, `openai/gpt-6-luna-decisions`, `perplexity/pplx-decider-v1(.1)-27b`,
`cloudflare/clef(-flash|-omni)`, `upstage/solar-decide`, `inception/mercury-decide`
(`DECISION_MODELS`; `DecisionsModelProvider` serves them, `JevModelProvider` is its deprecated alias).
Questions come from `Decision.noul` (yes/no → `noul` = P(yes)), `Decision.choice` (→ `choice`,
`probabilities`, `confidence`) and `Decision.score` (levels lowest first → `score` = the level's index);
the answers are typed by them. `state` is a text, a JSON object, or text and image parts
(`Decision.image(dataUrl)` — png/jpeg/webp data URLs; Luna, pplx-decider and Clef read images). At
most 200 questions per call; an answer that does not fit its question fails with
`model.decision.invalid-response`. `decide` on a chat model or `invoke` on a decision model throws
`ModelKindError` (`model.wrong-kind`).

```ts
import { Decision, Judge, type JudgeContext, type JudgeHandler } from "graphcompose/core";

@Judge({ name: "answer-grounded", model: "openai/gpt-6-luna-decisions", deps: [JOB_SEARCH] })
export class AnswerGrounded implements JudgeHandler {
  constructor(private readonly search: JobSearch) {}
  async judge(reply: string, ctx: JudgeContext) {
    const a = await ctx.model.decide({
      state: { task: ctx.task, reply, results: this.search.lastResults() },
      questions: {
        grounded: Decision.noul("Every fact in the reply appears in the results"),
        tone: Decision.choice("Tone of the reply", {
          neutral: "Plain, factual",
          pushy: "Sells or pressures",
        }),
        quality: Decision.score("Overall usefulness", ["useless", "partial", "complete"]),
      },
    });
    // a.grounded.noul: number; a.tone.choice: "neutral" | "pushy"; a.quality.score: number
    return a.grounded.noul > 0.7 && a.tone.choice === "neutral"
      ? { passed: true }
      : { passed: false, feedback: "Only state facts from the search results, neutrally." };
  }
}
```

In tests, script a chat judge like an agent — `mockLlm(Judge).thenReturn(replyWith("PASS"))` — and a
decision judge with its answers by question id (an option, P(yes), a level's index or text):
`mockLlm(AnswerGrounded).thenReturn(decideWith({ grounded: 0.9, tone: "neutral", quality: 2 }, { cost: usd(0.0002) }))`.

Routers and guards work on any decision model too (`@Router({ model: "openai/gpt-6-luna-decisions" })`):
one choice question over the routes, options sorted so declaration order never changes the request.

## Run Context & Observers

Every tool and action gets the run it is part of as `ctx.run` (`RunContext`): built once per
`execute` / `resume`, the same for every node of the run.

```ts
async execute(state: AgentState, ctx: ActionContext) {
  ctx.run.runId;      // RunId, unique per run, the same after a resume
  ctx.run.threadId;   // the conversation (ExecutionOutput.thread)
  ctx.run.signal;     // aborted by app.cancel(thread) or the caller's signal
  ctx.run.metadata;   // from execute(…, { metadata }), kept by the run's resumes
  ctx.run.owner;      // from execute(…, { owner }): who the thread belongs to
  ctx.idempotencyKey; // `${runId}:${node}` (+ `:${index}` inside batchParallel)
}

await app.execute(Start, input, { thread, owner: userId, signal, metadata: { tenant: "acme" }, onStream });
const { cancelled } = await app.cancel(thread, { owner: userId });
```

A thread created with an `owner` belongs to it: `execute` on that thread, `resume` and `cancel`
with another owner (or none) throw `ThreadOwnerError` (`run.thread-owner`) before anything runs or
is read. Tool arguments a channel shows (and `ExecutionOutput.pause.args`) have the input DTO's
`sensitive` fields masked as `***`; the tool itself still gets them whole.

Each run reserves its `limits.perRun.cost` of the day before its first model call, so concurrent
runs never jointly pass `limits.perDay.cost`; a workflow that sets `perDay.cost` without
`perRun.cost` fails at start with `[limits.per-run-required]`.

`execute` and `resume` forward `signal`, `metadata`, `onStream` (token and tool-call events) and
`configurable` (extra LangGraph keys; the framework's own win). `app.cancel(thread)` aborts a running
run — it stops before its next model or tool call and `execute` rejects with
`WorkflowCancelledError` — or drops a paused one, whose `resume` then throws `NotPausedError`;
`cancelled` is `false` when the thread had neither. In unit tests, `testRunContext()` from
`graphcompose/testing` builds a `ctx.run`.

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

## License

MIT — see [`LICENSE`](LICENSE).
