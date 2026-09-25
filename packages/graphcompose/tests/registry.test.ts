import { FakeListChatModel } from "@langchain/core/utils/testing";
import { describe, expect, it, vi } from "vitest";
import { createModelRegistry, resolveSettings } from "../src/llm/registry.js";
import { testConfig } from "./helpers.js";

describe("resolveSettings", () => {
  it("fills missing temperature, maxTokens, thinking, cache, timeout and retries from defaults", () => {
    const resolved = resolveSettings(testConfig.agents.alpha, testConfig.defaults.chat);

    expect(resolved).toEqual({
      model: "test/alpha",
      temperature: 0,
      maxTokens: "max",
      thinking: "default",
      cache: true,
      timeoutMs: 120_000,
      maxRetries: 2,
      price: testConfig.agents.alpha.price,
    });
  });

  it("keeps explicit values over defaults", () => {
    const resolved = resolveSettings(
      {
        ...testConfig.agents.alpha,
        temperature: 0.7,
        maxTokens: 50,
        thinking: "high",
        cache: false,
      },
      testConfig.defaults.chat,
    );

    expect(resolved.temperature).toBe(0.7);
    expect(resolved.maxTokens).toBe(50);
    expect(resolved.thinking).toBe("high");
    expect(resolved.cache).toBe(false);
  });
});

describe("createModelRegistry", () => {
  it("binds every configured agent", () => {
    const registry = createModelRegistry(
      testConfig,
      () => new FakeListChatModel({ responses: [] }),
    );

    expect([...registry.agents.keys()]).toEqual(["alpha", "beta"]);
  });

  it("reuses one client for identical settings", () => {
    const factory = vi.fn(() => new FakeListChatModel({ responses: [] }));
    const config = {
      ...testConfig,
      agents: {
        alpha: testConfig.agents.alpha,
        beta: { ...testConfig.agents.beta, model: "test/alpha" },
      },
    };

    const registry = createModelRegistry(config, factory);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(registry.agents.get("alpha")?.model).toBe(registry.agents.get("beta")?.model);
  });
});
