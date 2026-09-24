import { FakeListChatModel } from "@langchain/core/utils/testing";
import { ToolCallLimitExceededError } from "langchain";
import { describe, expect, it } from "vitest";
import { resolveRouterModel, type AgentsConfigOf } from "../src/config/types.js";
import { AgentFailedError } from "../src/graph/errors.js";
import { runAgent, type RunDeps } from "../src/index.js";
import { createModelRegistry } from "../src/llm/registry.js";
import { BUDGET_STOP_MESSAGE } from "../src/prompts/agents.js";
import { createRouter } from "../src/routers/index.js";
import { toolRegistry } from "../src/tools/index.js";
import { ScriptedChatModel, type Reply } from "./fakes/scripted-model.js";
import { decide, memoryLedger, testConfig, unusedJevClient, type TestAgent } from "./helpers.js";

interface Setup {
  readonly routes: string[];
  readonly alpha: readonly Reply[];
  readonly maxToolCalls?: number;
  readonly runBudgetCap?: number;
}

function setup({ routes, alpha, maxToolCalls = 3, runBudgetCap = 1 }: Setup) {
  const model = new ScriptedChatModel(alpha);
  const ledger = memoryLedger();
  const config: AgentsConfigOf<TestAgent> = {
    ...testConfig,
    budget: { runBudgetCap, dailyBudgetCap: 10 },
    agents: {
      ...testConfig.agents,
      alpha: { ...testConfig.agents.alpha, tools: ["current_time"], maxToolCalls },
    },
  };
  const router = new FakeListChatModel({ responses: routes });
  const deps: RunDeps<TestAgent> = {
    config,
    registry: createModelRegistry(config, (settings) =>
      settings.model === "test/alpha" ? model : new FakeListChatModel({ responses: ["beta"] }),
    ),
    router: createRouter(
      "main",
      resolveRouterModel(config.routers.main, config.defaults),
      config.defaults.chat,
      {
        chatModel: () => router,
        jevClient: unusedJevClient,
      },
    ),
    prompts: { alpha: "You are alpha.", beta: "You are beta." },
    tools: (name) => toolRegistry.get(name as never),
    ledger,
  };
  return { deps, model, ledger };
}

const toTokyo: Reply = [{ tool: "current_time", args: { timeZone: "Asia/Tokyo" } }];
const answered = [decide("alpha"), decide("finish", "done")];

describe("agents with tools", () => {
  it("runs the model ↔ tool loop and answers", async () => {
    const { deps, model } = setup({
      routes: answered,
      alpha: [toTokyo, "It is evening in Tokyo."],
    });

    const result = await runAgent({ task: "Time in Tokyo?" }, deps);

    expect(result.answer).toBe("It is evening in Tokyo.");
    expect(model.sent[1]?.at(-1)?.text).toContain('"timeZone":"Asia/Tokyo"');
  });

  it("lets the model see tool errors", async () => {
    const { deps, model } = setup({
      routes: answered,
      alpha: [
        [{ tool: "current_time", args: { timeZone: "Mars/Olympus" } }],
        "Unknown zone, sorry.",
      ],
    });

    await runAgent({ task: "Time on Mars?" }, deps);

    expect(model.sent[1]?.at(-1)?.text).toContain("Tool error:");
  });

  it("records each model call of the loop", async () => {
    const { deps } = setup({ routes: answered, alpha: [toTokyo, "Done."] });

    const result = await runAgent({ task: "Time?" }, deps);

    expect(result.cost.byCaller.alpha).toBeCloseTo((2 * (100 * 3 + 20 * 6)) / 1_000_000);
  });

  it("handles two tool calls in one model reply", async () => {
    const both: Reply = [
      { tool: "current_time", args: { timeZone: "Asia/Tokyo" } },
      { tool: "current_time", args: { timeZone: "Europe/London" } },
    ];
    const { deps, model } = setup({ routes: answered, alpha: [both, "Both zones."] });

    const result = await runAgent({ task: "Tokyo and London?" }, deps);

    expect(result.answer).toBe("Both zones.");
    expect(model.sent[1]?.filter((message) => message.type === "tool")).toHaveLength(2);
  });

  it("fails fast on the tool call limit and records spend of the failed agent", async () => {
    const { deps, ledger } = setup({
      routes: answered,
      alpha: [toTokyo, toTokyo, "never"],
      maxToolCalls: 1,
    });

    const failure = await runAgent({ task: "Loop" }, deps).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(AgentFailedError);
    expect((failure as AgentFailedError).cause).toBeInstanceOf(ToolCallLimitExceededError);
    expect(ledger.recorded.filter((record) => record.caller === "alpha").length).toBeGreaterThan(0);
  });

  it("stops the loop when the run budget is spent", async () => {
    const { deps, model } = setup({
      routes: answered,
      alpha: [toTokyo, "never sent"],
      runBudgetCap: 0.0004,
    });

    const result = await runAgent({ task: "Time?" }, deps);

    expect(model.sent).toHaveLength(1);
    expect(result.route).toEqual(["alpha"]);
    expect(result.answer).toBe(BUDGET_STOP_MESSAGE);
    expect(result.stopReason).toBe("budget exhausted");
  });
});
