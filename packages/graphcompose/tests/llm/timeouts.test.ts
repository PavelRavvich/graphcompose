import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_RETRIES,
  DEFAULT_TIMEOUT_MS,
  MODEL_MAX,
  type ResolvedModelSettings,
} from "../../src/config/types.js";
import type { ChatDefaults } from "../../src/config/types.js";
import { createJevClient } from "../../src/llm/jev-client.js";
import { createChatModel } from "../../src/llm/model.js";
import { resolveSettings } from "../../src/llm/registry.js";

const price = { inputPerMTok: 0, outputPerMTok: 0 };
const settings = (timeoutMs: number, maxRetries: number): ResolvedModelSettings => ({
  model: "a/b",
  temperature: 0,
  maxTokens: 10,
  thinking: "default",
  cache: false,
  timeoutMs,
  maxRetries,
  price,
});

let server: Server | undefined;
afterEach(() => {
  server?.closeAllConnections();
  server?.close();
  server = undefined;
});

/** A local OpenAI-compatible endpoint: `hang` never answers; otherwise every request gets a 500. */
async function endpoint(
  mode: "hang" | "fail",
): Promise<{ baseUrl: string; requests: () => number }> {
  let count = 0;
  server = createServer((_req, res) => {
    count += 1;
    if (mode === "fail")
      res
        .writeHead(500, { "content-type": "application/json" })
        .end('{"error":{"message":"boom"}}');
  });
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return { baseUrl: `http://127.0.0.1:${String(port)}/v1`, requests: () => count };
}

describe("model calls: LangChain's own timeout and retries (#95)", () => {
  it("AC1: a request that gets no answer fails within the timeout instead of hanging", async () => {
    const { baseUrl } = await endpoint("hang");
    const model = createChatModel(settings(200, 0), { apiKey: "k", baseUrl });
    const started = Date.now();

    await expect(model.invoke("hi")).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(3000);
  });

  it("AC2: a failed request is retried automatically before giving up", async () => {
    const { baseUrl, requests } = await endpoint("fail");
    const model = createChatModel(settings(5000, 2), { apiKey: "k", baseUrl });

    await expect(model.invoke("hi")).rejects.toThrow();
    expect(requests()).toBe(3);
  }, 20_000);

  it("AC3: sensible defaults for every model; the workflow or one agent can change them", () => {
    const defaults: ChatDefaults = {
      temperature: 0,
      maxTokens: MODEL_MAX,
      thinking: "default",
      cache: true,
    };

    expect(resolveSettings({ model: "a/b", price }, defaults)).toMatchObject({
      timeoutMs: DEFAULT_TIMEOUT_MS,
      maxRetries: DEFAULT_MAX_RETRIES,
    });
    expect(
      resolveSettings({ model: "a/b", price }, { ...defaults, timeoutMs: 30_000, maxRetries: 0 }),
    ).toMatchObject({
      timeoutMs: 30_000,
      maxRetries: 0,
    });
    expect(
      resolveSettings({ model: "a/b", price, timeoutMs: 5000 }, { ...defaults, timeoutMs: 30_000 })
        .timeoutMs,
    ).toBe(5000);
  });
});

describe("Jev calls: the standard fetch abort signal (#95)", () => {
  it("AC4: a decision that gets no answer fails in time (the router then falls back as for any failure)", async () => {
    const neverAnswers: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(init.signal?.reason as Error);
        });
      });
    const jev = createJevClient(
      { apiKey: "k", baseUrl: "https://example.test/api/v1" },
      neverAnswers,
      50,
    );
    const started = Date.now();

    await expect(
      jev({ model: "typesafe/jev", input: "x", options: [] } as never),
    ).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(2000);
  });
});
