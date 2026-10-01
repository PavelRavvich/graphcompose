import { TestWorkflow } from "./fixtures/test-workflow/test.workflow.js";
import { workflowOf } from "../src/components/index.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FakeListChatModel } from "@langchain/core/utils/testing";
import { describe, expect, it, vi } from "vitest";
import { createAppDeps } from "../src/app/app-deps.js";
import { createApp } from "../src/app/create-app.js";
import type { ModelGateway } from "../src/llm/gateway.js";
import { TestChat } from "./fixtures/test-flow/test.flow.js";
import { MODEL_MAX, type ResolvedModelSettings } from "../src/config/types.js";
import {
  createChatModel,
  ModelConfigError,
  OPENROUTER_BASE_URL,
  readOpenRouterEnv,
  reasoningParams,
} from "../src/llm/model.js";

const connection = { apiKey: "k", baseUrl: OPENROUTER_BASE_URL };
const settings: ResolvedModelSettings = {
  model: "a/b",
  temperature: 0,
  maxTokens: 10,
  thinking: "default",
  cache: true,
  timeoutMs: 1000,
  maxRetries: 0,
  price: { inputPerMTok: 0, outputPerMTok: 0 },
};

describe("readOpenRouterEnv", () => {
  it("throws when the API key is missing", () => {
    expect(() => readOpenRouterEnv({})).toThrow(ModelConfigError);
  });

  it("uses the OpenRouter base URL by default", () => {
    expect(readOpenRouterEnv({ OPENROUTER_API_KEY: "k" })).toEqual(connection);
  });

  it("allows overriding the base URL", () => {
    const env = { OPENROUTER_API_KEY: "k", OPENROUTER_BASE_URL: "http://localhost:8080/v1" };

    expect(readOpenRouterEnv(env).baseUrl).toBe("http://localhost:8080/v1");
  });
});

describe("reasoningParams", () => {
  it("sends nothing for the model default", () => {
    expect(reasoningParams("default")).toBeUndefined();
  });

  it("maps an effort level and hides thoughts from the response", () => {
    expect(reasoningParams("high")).toEqual({ effort: "high", exclude: true });
  });

  it("maps an explicit thinking budget", () => {
    expect(reasoningParams({ budgetTokens: 2000 })).toEqual({ max_tokens: 2000, exclude: true });
  });
});

describe("createChatModel", () => {
  it("passes a numeric maxTokens and no reasoning by default", () => {
    const model = createChatModel(settings, connection);

    expect(model).toMatchObject({ model: "a/b", maxTokens: 10 });
    expect(model).not.toHaveProperty("modelKwargs.reasoning");
  });

  it("omits maxTokens for MODEL_MAX and sends reasoning when thinking is set", () => {
    const model = createChatModel(
      { ...settings, maxTokens: MODEL_MAX, thinking: "low" },
      connection,
    );

    expect(model).toMatchObject({ modelKwargs: { reasoning: { effort: "low", exclude: true } } });
    expect(model).not.toHaveProperty("maxTokens", MODEL_MAX);
  });
});

describe("createAppDeps", () => {
  it("wires every agent of the flow with a prompt, and its Jev router", async () => {
    const deps = await createAppDeps(await workflowOf(TestWorkflow), {
      env: { OPENROUTER_API_KEY: "k", TERN_DB: ":memory:" },
    });

    expect([...deps.registry.agents.keys()].sort()).toEqual(Object.keys(deps.prompts).sort());
    expect(deps.routers.map((router) => [router.name, router.model])).toEqual([
      ["main", "typesafe/jev-1.13"],
    ]);
    expect(deps.tools("current_time").name).toBe("current_time");
    await deps.close();
  });
});

/** Decides by router: guards pass, "main" sends the message to the researcher once, then answers. */
function scriptedDecisions(): ModelGateway["decide"] {
  let mainVisits = 0;
  return ({ router }) => {
    const next = router.startsWith("guard:")
      ? "pass"
      : mainVisits++ === 0
        ? "researcher"
        : "answer";
    return Promise.resolve({
      kind: "decided",
      decision: { next, reason: "scripted", confidence: 1 },
    });
  };
}

describe("AC12: createAppDeps on an injected model gateway", () => {
  it("AC12: needs no OpenRouter credentials, and every model call of a run goes through the gateway", async () => {
    const chatModel = vi.fn<ModelGateway["chatModel"]>(
      () => new FakeListChatModel({ responses: ["Found it."] }),
    );
    const decide = vi.fn(scriptedDecisions());
    const env = { TERN_DB: ":memory:", SPEND_LEDGER_DIR: mkdtempSync(join(tmpdir(), "gc-135-")) };
    const app = await createApp(TestWorkflow, { env, gateway: { chatModel, decide } });

    const result = await app.run(TestChat, { text: "What time is it?" });
    await app.close();

    expect(result.status).toBe("answered");
    expect(decide.mock.calls.map(([spec]) => spec.router)).toEqual([
      "guard:prompt_injection",
      "main",
      "main",
      "guard:pii",
    ]);
    expect(chatModel).toHaveBeenCalledWith(
      expect.objectContaining({ user: { kind: "agent", agent: "researcher" } }),
    );
  });
});
