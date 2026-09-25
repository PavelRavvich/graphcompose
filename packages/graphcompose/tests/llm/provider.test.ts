import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { MODEL_MAX, type ChatDefaults, type ModelSettings } from "../../src/config/types.js";
import { createChatModel } from "../../src/llm/model.js";
import { resolveSettings } from "../../src/llm/registry.js";

const price = { inputPerMTok: 0, outputPerMTok: 0 };
const defaults: ChatDefaults = { temperature: 0, thinking: "default", cache: false };

let server: Server | undefined;
afterEach(() => {
  server?.close();
  server = undefined;
});

/** A local OpenAI-compatible endpoint that answers "ok" and keeps the request bodies it got. */
async function endpoint(): Promise<{ baseUrl: string; bodies: Record<string, unknown>[] }> {
  const bodies: Record<string, unknown>[] = [];
  server = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => (raw += chunk.toString()));
    req.on("end", () => {
      bodies.push(JSON.parse(raw) as Record<string, unknown>);
      res.writeHead(200, { "content-type": "application/json" }).end(
        JSON.stringify({
          id: "x",
          object: "chat.completion",
          created: 1,
          model: "a/b",
          choices: [
            { index: 0, message: { role: "assistant", content: "ok" }, finish_reason: "stop" },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return { baseUrl: `http://127.0.0.1:${String(port)}/v1`, bodies };
}

const send = async (
  settings: ModelSettings,
  chat: ChatDefaults = defaults,
): Promise<Record<string, unknown>> => {
  const { baseUrl, bodies } = await endpoint();
  await createChatModel(resolveSettings(settings, chat), { apiKey: "k", baseUrl }).invoke("hi");
  return bodies[0] ?? {};
};

describe("provider routing and the output ceiling (#97)", () => {
  it("AC1: provider preferences reach OpenRouter in its own format; an agent's replaces the default", async () => {
    const body = await send(
      { model: "a/b", price, provider: { ignore: ["Inceptron"], allowFallbacks: false } },
      { ...defaults, provider: { sort: "latency" } },
    );
    const fromDefault = await send(
      { model: "a/b", price },
      { ...defaults, provider: { sort: "latency" } },
    );

    expect(body.provider).toEqual({ ignore: ["Inceptron"], allow_fallbacks: false });
    expect(fromDefault.provider).toEqual({ sort: "latency" });
    expect((await send({ model: "a/b", price })).provider).toBeUndefined();
  });

  it("AC2: 8192 output tokens by default; no ceiling only when MODEL_MAX is set explicitly", async () => {
    expect((await send({ model: "a/b", price })).max_tokens).toBe(8192);
    expect((await send({ model: "a/b", price, maxTokens: 2000 })).max_tokens).toBe(2000);
    expect((await send({ model: "a/b", price, maxTokens: MODEL_MAX })).max_tokens).toBeUndefined();
  });
});
