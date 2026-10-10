import { describe, expect, it, vi } from "vitest";
import { A2AAdapter } from "../../src/a2a/a2a-adapter.js";
import type { App } from "../../src/app/types.js";

describe("A2AAdapter", () => {
  it("should execute app and map output to response", async () => {
    const app = {
      execute: vi.fn().mockResolvedValue({ status: "answered", thread: "123" }),
    } as unknown as App;
    const adapter = new A2AAdapter(app);
    class DummyWorkflow {
      public noop = 1;
    }
    const res = await adapter.execute(DummyWorkflow, { input: "test" });
    expect(res).toEqual({ status: "finished", thread: "123" });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(app.execute).toHaveBeenCalledWith(DummyWorkflow, "test", expect.any(Object));
  });
});
