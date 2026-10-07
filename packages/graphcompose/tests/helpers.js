/* eslint-disable @typescript-eslint/require-await */
import { FakeListChatModel } from "@langchain/core/utils/testing";
import { MODEL_MAX } from "../src/config/types.js";
import { createModelRegistry } from "../src/llm/registry.js";
import { createModelGateway } from "../src/llm/gateway.js";
import { flowRouterFactory } from "../src/graph/router-model.js";
import { usd } from "../src/units/index.js";
import { testFlow, testRouters } from "./fixtures/test-flow/test.flow.js";
import { NO_GUARDS } from "../src/guards/index.js";
import { createSqliteTernStore } from "../src/terns/index.js";
import { toolOf } from "../src/testing/index.js";
import { Clock } from "./fixtures/test-workflow/test.workflow.js";
/** The test agents' config; their flow (`testFlow`) routes through an LLM router ("test/router"). */
export const testConfig = {
    name: "test-bundle",
    version: "1.0.0",
    defaults: {
        models: { temperature: 0, maxTokens: MODEL_MAX, thinking: "default", cache: true },
        router: { kind: "jev", model: "typesafe/jev-test" },
        tools: { maxToolCalls: 3 },
        history: { limit: 2 },
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
/** The test workflow's limits: $1 per run, $10 per day; steps by default ((2 + 1) × 3). */
export const testLimits = { perRun: { cost: usd(1) }, perDay: { cost: usd(10) } };
export const fakeChatFactory = (script) => (settings) => new FakeListChatModel({ responses: script[settings.model] ?? [] });
export const unusedJevClient = () => Promise.reject(new Error("jev not used"));
/** The default gateway over fake clients: chat models from `chatModel`, Jev from `jevClient`. */
export const fakeGateway = (chatModel, jevClient = unusedJevClient) => createModelGateway({ chatModel, jevClient });
/** In-memory ledger: starts at `spentToday`, remembers what runs record. */
export function memoryLedger(spentToday = 0) {
    const recorded = [];
    return {
        recorded,
        spentToday: () => Promise.resolve(spentToday + recorded.reduce((sum, record) => sum + record.costUsd, 0)),
        record: (_bundle, records) => {
            recorded.push(...records);
            return Promise.resolve();
        },
    };
}
/** The test flow, its routers on `chatModel` ("test/router" scripts them) and the given limits. */
export function flowDeps(chatModel, limits = testLimits) {
    return {
        flow: testFlow,
        limits,
        routers: testRouters,
        routerFor: flowRouterFactory({
            gateway: fakeGateway(chatModel),
            chatDefaults: testConfig.defaults.models,
            chatModelSettings: (model) => ({ model, price: { inputPerMTok: 1, outputPerMTok: 2 } }),
        }),
    };
}
export function fakeDeps(script, ledger = memoryLedger()) {
    const chatModel = fakeChatFactory(script);
    return {
        config: testConfig,
        registry: createModelRegistry(testConfig, fakeGateway(chatModel)),
        ...flowDeps(chatModel),
        prompts: { alpha: async () => "You are alpha.", beta: async () => "You are beta." },
        tools: libraryTool,
        ledger,
        terns: createSqliteTernStore(":memory:"),
        guards: NO_GUARDS,
    };
}
export const decide = (next, reason = "test") => JSON.stringify({ next, reason });
export const usageRecord = (caller, costUsd) => ({
    caller,
    model: "test/m",
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    costUsd,
    costSource: "price-table",
});
export function baseState(overrides = {}) {
    return {
        task: "Do the thing",
        history: [],
        runId: "run-test",
        next: "",
        routeReason: "",
        contributions: [],
        usage: [],
        budgetUsd: Number.POSITIVE_INFINITY,
        answer: "",
        finishes: {},
        guarded: "",
        approvals: [],
        summaries: [],
        payload: {},
        batchItem: undefined,
        _batchCursor: {},
        ...overrides,
    };
}
/** The core's library tools by name (what agents in test configs may list). */
export function libraryTool(name) {
    if (name === "current_time")
        return toolOf(new Clock());
    throw new Error(`Unknown tool "${name}"`);
}
/** The deps with every router request recorded (what the routers saw, in order). */
export function recordingRouters(deps) {
    const requests = [];
    const routerFor = (loaded) => {
        const router = deps.routerFor(loaded);
        return {
            name: router.name,
            route: (request) => {
                requests.push(request);
                return router.route(request);
            },
        };
    };
    return { deps: { ...deps, routerFor }, requests };
}
/** A flow state: `baseState` plus the engine's fields, before any node ran. */
export function flowState(overrides = {}) {
    return {
        optionalBranches: [],
        ...baseState(),
        start: "",
        previousAgent: "",
        payload: {},
        forks: {},
        visits: {},
        steps: 0,
        path: [],
        daySpentBeforeRunUsd: null,
        ...overrides,
    };
}
