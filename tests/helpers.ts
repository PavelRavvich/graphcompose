import { FakeListChatModel } from "@langchain/core/utils/testing";
import { MODEL_MAX, resolveRouterModel, type AgentsConfigOf } from "../src/config/types.js";
import type { UsageRecord } from "../src/finops/usage.js";
import type { SpendLedger } from "../src/finops/ledger.js";
import type { AgentStateType } from "../src/graph/state.js";
import type { JevClient } from "../src/llm/jev-client.js";
import { createModelRegistry, type ModelFactory } from "../src/llm/registry.js";
import type { RunDeps } from "../src/index.js";
import { createRouter } from "../src/routers/index.js";
import { NO_GUARDS } from "../src/guards/index.js";
import { createSqliteTernStore } from "../src/terns/index.js";
import { toolRegistry } from "../src/tools/index.js";

export type TestAgent = "alpha" | "beta";

/** Main router overridden to an LLM so graph tests can script routing with fake chat models. */
export const testConfig: AgentsConfigOf<TestAgent> = {
  name: "test-bundle",
  defaults: {
    chat: { temperature: 0, maxTokens: MODEL_MAX, thinking: "default", cache: true },
    router: { kind: "jev", model: "typesafe/jev-test" },
    tools: { maxToolCalls: 3 },
    history: { limit: 2 },
  },
  budget: { runBudgetCap: 1, dailyBudgetCap: 10, evalBudgetCap: 5 },
  routers: {
    main: {
      maxHops: 3,
      model: { kind: "llm", model: "test/router", price: { inputPerMTok: 1, outputPerMTok: 2 } },
    },
  },
  agents: {
    alpha: {
      model: "test/alpha",
      description: "Handles alpha work",
      price: { inputPerMTok: 3, outputPerMTok: 6 },
    },
    beta: {
      model: "test/beta",
      description: "Handles beta work",
      price: { inputPerMTok: 3, outputPerMTok: 6 },
    },
  },
};

/** Scripted responses per model slug. */
export type ModelScript = Readonly<Record<string, string[]>>;

export const fakeChatFactory =
  (script: ModelScript): ModelFactory =>
  (settings) =>
    new FakeListChatModel({ responses: script[settings.model] ?? [] });

export const unusedJevClient: JevClient = () => Promise.reject(new Error("jev not used"));

/** In-memory ledger: starts at `spentToday`, remembers what runs record. */
export function memoryLedger(spentToday = 0): SpendLedger & { readonly recorded: UsageRecord[] } {
  const recorded: UsageRecord[] = [];
  return {
    recorded,
    spentToday: () =>
      Promise.resolve(spentToday + recorded.reduce((sum, record) => sum + record.costUsd, 0)),
    record: (_bundle, records) => {
      recorded.push(...records);
      return Promise.resolve();
    },
  };
}

export function fakeDeps(
  script: ModelScript,
  ledger: SpendLedger = memoryLedger(),
): RunDeps<TestAgent> {
  const chatModel = fakeChatFactory(script);
  return {
    config: testConfig,
    registry: createModelRegistry(testConfig, chatModel),
    router: createRouter(
      "main",
      resolveRouterModel(testConfig.routers.main, testConfig.defaults),
      testConfig.defaults.chat,
      { chatModel, jevClient: unusedJevClient },
    ),
    prompts: { alpha: "You are alpha.", beta: "You are beta." },
    tools: (name) => toolRegistry.get(name as never),
    ledger,
    terns: createSqliteTernStore(":memory:"),
    guards: NO_GUARDS,
    reviewers: new Map(),
  };
}

export const decide = (next: string, reason = "test"): string => JSON.stringify({ next, reason });

export const usageRecord = (caller: string, costUsd: number): UsageRecord => ({
  caller,
  model: "test/m",
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  costUsd,
  costSource: "price-table",
});

export function baseState(overrides: Partial<AgentStateType> = {}): AgentStateType {
  return {
    task: "Do the thing",
    history: [],
    runId: "run-test",
    next: "",
    routeReason: "",
    hops: 0,
    contributions: [],
    usage: [],
    budgetUsd: Number.POSITIVE_INFINITY,
    answer: "",
    guarded: "",
    ...overrides,
  };
}
