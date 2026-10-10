import { describe, expect, it, vi } from "vitest";
import { A2AClient } from "../../src/a2a/a2a-client.js";

describe("A2AClient", () => {
  it("should execute and return json result", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ result: "success" }),
    });
    const client = new A2AClient({ endpoint: "http://test", fetcher });
    const result = await client.execute({ test: 1 });
    expect(result).toBe("success");
    expect(fetcher).toHaveBeenCalledWith(
      "http://test/execute",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ input: { test: 1 } }),
      }),
    );
  });

  it("should pass abort signal to fetcher", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ result: "success" }),
    });
    const client = new A2AClient({ endpoint: "http://test", fetcher });
    const ac = new AbortController();
    await client.execute({ test: 1 }, undefined, ac.signal);
    expect(fetcher).toHaveBeenCalledWith(
      "http://test/execute",
      expect.objectContaining({
        signal: ac.signal,
      }),
    );
  });
});
