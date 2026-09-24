import { describe, expect, it } from "vitest";
import { createAppDeps } from "../src/app.js";
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
  it("wires every configured agent with a prompt and the Jev main router", async () => {
    const deps = await createAppDeps({ OPENROUTER_API_KEY: "k" });

    expect([...deps.registry.agents.keys()].sort()).toEqual(Object.keys(deps.prompts).sort());
    expect(deps.router.name).toBe("main");
    await deps.close();
  });
});
