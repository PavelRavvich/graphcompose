import { describe, expect, it, vi } from "vitest";
import { resolveRouterModel } from "../../src/config/types.js";
import type { JevClient } from "../../src/llm/jev-client.js";
import { createRouter } from "../../src/routers/index.js";
import { fakeChatFactory, testConfig, unusedJevClient } from "../helpers.js";
import { jevAnswer, request } from "./fixtures.js";

describe("resolveRouterModel", () => {
  it("uses the default Jev model when a router sets none", () => {
    expect(resolveRouterModel({ maxHops: 1 }, testConfig.defaults)).toEqual({
      kind: "jev",
      model: "typesafe/jev-test",
    });
  });

  it("uses the router's own model when set", () => {
    expect(resolveRouterModel(testConfig.routers.main, testConfig.defaults).kind).toBe("llm");
  });
});

describe("createRouter", () => {
  it("builds a Jev router for kind jev", async () => {
    const client = vi.fn<JevClient>(() => Promise.resolve(jevAnswer({ choice: "finish" })));
    const router = createRouter("main", testConfig.defaults.router, testConfig.defaults.chat, {
      chatModel: fakeChatFactory({}),
      jevClient: client,
    });

    await router.route(request);

    expect(router.name).toBe("main");
    expect(client).toHaveBeenCalledOnce();
  });

  it("builds an LLM router with chat defaults applied for kind llm", () => {
    const chatModel = vi.fn(fakeChatFactory({}));
    const model = resolveRouterModel(testConfig.routers.main, testConfig.defaults);

    createRouter("main", model, testConfig.defaults.chat, {
      chatModel,
      jevClient: unusedJevClient,
    });

    expect(chatModel).toHaveBeenCalledWith(
      expect.objectContaining({ model: "test/router", maxTokens: "max", cache: true }),
    );
  });
});
