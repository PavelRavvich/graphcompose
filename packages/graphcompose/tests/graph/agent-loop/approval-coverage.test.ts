import { describe, it, expect, vi } from "vitest";
import { pauseSeamApproval } from "../../../src/graph/agent-loop/approval.js";

vi.mock("@langchain/langgraph", async (importOriginal) => {
  const mod = await importOriginal<any>();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    ...mod,

    interrupt: (arg: any) => {
      if (arg.callId === "throw-interrupt") {
        const err = new Error("interrupted");
        // eslint-disable-next-line no-restricted-syntax -- fake interrupt; replaced by a real channel e2e test in #188
        err.name = "NodeInterrupt";
        throw err;
      }

      return arg.callId === "adapted" ? "mock-raw" : { approved: true, by: "lead" };
    },
  };
});

describe("pauseSeamApproval coverage", () => {
  it("interprets raw decision via channel adapter", async () => {
    const approval = pauseSeamApproval(undefined, (channel: string) => {
      if (channel === "my-channel") {
        return { interpret: async (raw: any) => ({ approved: true, by: "channel-adapter" }) };
      }
      return undefined;
    });

    const decision = await approval.requestApproval(
      { arguments: { a: 1 } } as any,
      "Agent1",

      { name: "tool1", channel: "my-channel" } as any,
      "run1",
      {},

      { callId: "adapted", isFirstCall: true },
    );
    expect(decision.approved).toBe(true);

    expect((decision as any).by).toBe("channel-adapter");
  });

  it("dispatches channel event when interrupted via adapter throw", async () => {
    const dispatchMock = vi.fn().mockResolvedValue(undefined);

    const observerMock = { onChannelStart: vi.fn(), onChannelEnd: vi.fn() } as any;

    const approval = pauseSeamApproval(
      dispatchMock,

      (channel: string) => {
        return {
          interpret: async (raw: any) => {
            const err = new Error("interrupted");
            // eslint-disable-next-line no-restricted-syntax -- fake interrupt; replaced by a real channel e2e test in #188
            err.name = "NodeInterrupt";
            throw err;
          },
        };
      },
      observerMock,
    );

    await expect(
      approval.requestApproval(
        { arguments: { a: 1 } } as any,
        "Agent1",

        { name: "tool1", channel: "my-channel" } as any,
        "run1",
        {},

        { callId: "adapted", isFirstCall: true } as any,
      ),
    ).rejects.toThrow("interrupted");

    expect(dispatchMock).toHaveBeenCalled();

    expect(observerMock.onChannelStart).toHaveBeenCalled();
  });
});
