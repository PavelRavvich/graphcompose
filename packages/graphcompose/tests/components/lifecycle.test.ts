import { describe, expect, it } from "vitest";
import { startAll, stopAll } from "../../src/components/lifecycle.js";

describe("AC12: lifecycle hooks of components", () => {
  it("starts in creation order and stops dependants first; things without hooks are skipped", async () => {
    const log: string[] = [];
    const hooked = (name: string) => ({
      onStart: () => {
        log.push(`start ${name}`);
      },
      onStop: () => {
        log.push(`stop ${name}`);
      },
    });

    await startAll([hooked("dependency"), { plain: true }, hooked("dependant")]);
    await stopAll([hooked("dependency"), null, hooked("dependant")]);

    expect(log).toEqual([
      "start dependency",
      "start dependant",
      "stop dependant",
      "stop dependency",
    ]);
  });

  it("every onStop runs even when one fails; the failures are reported together", async () => {
    const stopped: string[] = [];
    const failing = { onStop: () => Promise.reject(new Error("disk gone")) };
    const fine = {
      onStop: () => {
        stopped.push("fine");
      },
    };

    await expect(stopAll([fine, failing])).rejects.toBeInstanceOf(AggregateError);
    expect(stopped).toEqual(["fine"]);
  });
});
