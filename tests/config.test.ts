import { describe, expect, it } from "vitest";
import { agentsConfig } from "../src/config/agents.config.js";
import { MODEL_MAX, validateAgentsConfig, type AgentsConfig } from "../src/config/types.js";
import { testConfig } from "./helpers.js";

describe("validateAgentsConfig", () => {
  it("accepts the shipped config: Jev routers by default, model-max output", () => {
    const config = validateAgentsConfig(agentsConfig);

    expect(config.defaults.router.kind).toBe("jev");
    expect(config.defaults.chat.maxTokens).toBe(MODEL_MAX);
  });

  it("accepts a router override", () => {
    expect(validateAgentsConfig(testConfig)).toBe(testConfig);
  });

  it("rejects a config without agents", () => {
    const config: AgentsConfig = { ...testConfig, agents: {} };

    expect(() => validateAgentsConfig(config)).toThrow("at least one agent");
  });

  it("rejects a negative price", () => {
    const config: AgentsConfig = {
      ...testConfig,
      agents: {
        alpha: { ...testConfig.agents.alpha, price: { inputPerMTok: -1, outputPerMTok: 0 } },
      },
    };

    expect(() => validateAgentsConfig(config)).toThrow();
  });
});
