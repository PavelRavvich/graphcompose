# QUALITY

Rules the code must satisfy. `make check` enforces what a machine can; the rest is checked in
self-review before every PR.

## Design

- **SRP.** One module = one reason to change. One graph node per file.
- **DRY.** Second copy of logic → extract. Third copy is a defect.
- **Small units.** Files ≤ 200 lines (lint-enforced), functions ≤ 50 lines, cyclomatic
  complexity ≤ 10.
- **Dependency injection over globals.** Models, tools and clients are passed in (factory
  arguments), never imported as singletons. This is what makes graphs testable.
- **Pure core, effectful edges.** Business logic is pure; I/O (LLM, network, fs) sits at the
  boundary behind a small interface.
- **Names say intent.** `routeToolCall`, not `handle`. Booleans read as questions: `isFinal`,
  `hasToolCalls`. No abbreviations except well-known ones (`id`, `url`, `llm`).
- **Refactor while green.** Only after tests pass; never mix refactor and behaviour change in
  one commit.

## Types — the code is fully typed

Types are documentation that the compiler checks. A reader must understand **what a variable
holds from its type**, not guess it from the name.

- **Every domain concept has a named type.** Object shapes → `interface`; unions, function
  types, mapped types → `type`. No anonymous object types in exported signatures, no
  `Record<string, unknown>` / `object` / bare `string` where a domain type exists.
  - ✗ `function run(cfg: { key: string; m: string }): Promise<string>`
  - ✓ `function run(config: ModelConfig): Promise<AgentAnswer>`
- **Generics for reusable abstractions.** Nodes, tool wrappers, result types, repositories,
  retry helpers are generic with constraints (`<TState extends object>`) — not copy-pasted per
  type and not widened to `unknown`. With more than one parameter, name them: `TState`,
  `TUpdate`, `TInput`, `TOutput`. See `src/graph/types.ts`.
- **Branded types for primitives that can be confused**: IDs, model slugs, thread ids, amounts.
  `type ModelId = Brand<string, "ModelId">` (`src/types/brand.ts`). The brand is applied once,
  at the validated boundary.
- **Discriminated unions for variants and outcomes**:
  `type ToolResult<T> = { kind: "ok"; value: T } | { kind: "error"; error: ToolError }`.
  `switch` over `kind` is exhaustive (default branch assigns to `never`).
- **One source per shape — derive, don't duplicate**: `z.infer<typeof Schema>`,
  `typeof AgentState.State`, `ReturnType`, `Parameters`, `Pick` / `Omit`.
- **Immutable by default**: `readonly` fields and `ReadonlyArray` for data; `as const` for
  literal tables.
- **Compiler settings are the floor**: `strict` + `noUncheckedIndexedAccess`. No `any`, no
  non-null `!`, no `as` except at a validated boundary (parsing / branding). Exported functions
  have explicit return types.
- External input (CLI, HTTP, tool arguments, model JSON output) is parsed with **zod** at the
  boundary; inside the system, types are trusted.
- Errors: throw typed `Error` subclasses with context; never swallow. No `console.log` in `src/`.

## Agents (LangGraph)

- **Config-driven.** Agents, routers, models, thinking, caching, hop limit and budget live in
  `src/config/agents.config.ts` (`as const satisfies AgentsConfig`, zod-validated at startup).
  Every chat model inherits `defaults.chat`; every router inherits `defaults.router` (Jev). Model
  choice is config, never code. Reference: Wiki → Configuration.
- **`MODEL_MAX` is the only way to say "no output cap"** — never a magic large number.
- **Thinking and caching are per model**: `thinking` (`"default"`, effort level or
  `{ budgetTokens }`) and `cache`. Explicit cache breakpoints go through `withCacheBreakpoint`;
  no provider-specific request code outside `src/llm`.
- **Routers are isolated** (`src/routers`): input is plain text + options, output is a
  `RouteOutcome` union (`decided` | `failed`); they import only `config`, `finops`, `llm`, and the
  rest of the code imports them only via `src/routers/index.ts` — ESLint-enforced. Routers are
  tested on their own (`npm run test:routers`), the graph adapter separately.
- **Routing is built in, not a framework**: the router node wraps a `Router`; a pure
  `routeAfterRouter` on a conditional edge switches on the state. Failures end the run safely.
- **Classification is not generation**: routing, guards and detection use a decision model
  (Jev) — calibrated probabilities over fixed options; chat models produce content.
- State is declared once in `src/graph/state.ts` (`Annotation.Root`). Nodes are typed with
  `SyncNode` / `AsyncNode<TState, TUpdate>` and return only the keys they own.
- Models are created only through the registry (`src/llm/registry.ts`) with the OpenRouter
  factory (`src/llm/model.ts`) and injected; tests inject fakes through the same registry.
- Prompts live in `src/prompts/` (agents, graph) and `src/routers/prompts.ts` (routers own their
  prompts to stay isolated). No prompt strings inside nodes.
- Tools: zod schema for arguments, tested standalone before being wired into a graph. For a
  tool-using agent use `createAgent` from `langchain`.
- Bound every loop: `router.maxHops` plus LangGraph `recursionLimit`.

## FinOps

- **Every LLM call is accounted.** Each node that calls a model appends a `UsageRecord`
  (caller, model, tokens, USD) via `recordUsage`. An untracked model call is a defect.
- **Prefer reported cost over estimates**: Jev returns the exact cost per call
  (`costSource: "api"`); chat models are priced from the table (`costSource: "price-table"`,
  USD per 1M tokens in `agents.config.ts`, verified on openrouter.ai/models).
- **Budget per agent bundle** (`config.name`, `budget` in config):
  - `dailyBudgetCap` — USD the bundle may spend per UTC day; the counter resets at 00:00 UTC.
    Spend is kept in a ledger outside the repo (`SPEND_LEDGER_DIR`, default
    `~/.langgraph-agents/spend/<bundle>/<YYYY-MM-DD>.jsonl`) and written call by call while the
    run streams, so a crashed run's spend still counts.
  - `runBudgetCap` — USD one run may spend. A run gets `min(runBudgetCap, dailyBudgetCap − spent
today)`; nothing left → `BudgetExceededError` before any call.
  - The router node checks the run budget before every paid routing call. Both caps are soft by
    one call (a call in flight cannot be stopped); parallel runs of one bundle can overshoot the
    daily cap by their in-flight calls. With `MODEL_MAX` one call is bounded only by the model.
  - Only `runAgent` enforces the daily cap; `npm run studio` runs the graph without it.
- **Caching is accounted**: cached input is priced at `cacheReadPerMTok` / `cacheWritePerMTok`
  (fallback: input price); `CostReport.cacheReadTokens` shows how much caching saved.
- **Right-size models**: the cheapest capable model for routing/classification; expensive
  models only for agents that need them; thinking only where it pays off.
- **Every run returns a `CostReport`** (total, calls, per caller); the CLI prints it. New
  cost-relevant behaviour gets a test asserting the accounting.
- **$0 test suite**: unit tests use fake models; real calls only in `make smoke`.
- Per-call inspection (latency, tokens, prompts): LangSmith tracing via env, no code changes.

## Tests

- **Coverage ≥ 80%** lines / branches / functions / statements (enforced).
- Tests never hit a real LLM or network. Use `FakeListChatModel` /
  `FakeStreamingChatModel` from `@langchain/core/utils/testing`.
- Real-model checks go to `tests/smoke/` and run only via `make smoke`.
- Each spec test case → one test. Name tests by behaviour:
  `it("returns a fallback answer when the model output is empty")`.
- Arrange / Act / Assert, one behaviour per test, no logic in tests.
- Required per ticket: happy path, edge cases from the spec, regression for touched behaviour.

## Self-review checklist (before PR)

- [ ] Diff contains only what the issue asks for
- [ ] No file over 200 lines, no function over 50
- [ ] No duplicated logic introduced
- [ ] Every new concept has a named type; no anonymous object types in exported signatures
- [ ] Reusable code is generic, not duplicated per type; confusable primitives are branded
- [ ] New external input is zod-validated
- [ ] No prompt strings in nodes, no real LLM in tests
- [ ] Every new model call records usage; new agents have a price and a prompt
- [ ] Names are intention-revealing; no dead code, no commented-out code
- [ ] Every spec test case has a matching test
