import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withSpinner } from "../src/cli/spinner.js";
describe("chat loader", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    it("animates with elapsed time on a terminal and clears the line", async () => {
        const written = [];
        let clock = 0;
        const out = { isTTY: true, write: (text) => written.push(text) };
        let finish = () => undefined;
        const running = withSpinner(out, "thinking", () => new Promise((resolve) => (finish = resolve)), () => clock);
        clock = 3200;
        vi.advanceTimersByTime(250);
        finish("done");
        expect(await running).toBe("done");
        expect(written.some((text) => text.includes("thinking… 3.2s"))).toBe(true);
        expect(written.at(-1)).toBe("\r\u001b[2K");
    });
    it("clears the line when the turn fails", async () => {
        const written = [];
        const out = { isTTY: true, write: (text) => written.push(text) };
        await expect(withSpinner(out, "thinking", () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
        expect(written.at(-1)).toBe("\r\u001b[2K");
    });
    it("writes nothing when output is not a terminal", async () => {
        const write = vi.fn();
        expect(await withSpinner({ write }, "thinking", () => Promise.resolve(1))).toBe(1);
        expect(write).not.toHaveBeenCalled();
    });
});
