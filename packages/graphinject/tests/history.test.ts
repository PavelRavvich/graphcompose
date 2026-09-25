import { FakeListChatModel } from "@langchain/core/utils/testing";
import { describe, expect, it, vi } from "vitest";
import { formatHistory } from "../src/graph/contributions.js";
import { runAgent, UnknownThreadError, type RunDeps } from "../src/index.js";
import { createModelRegistry } from "../src/llm/registry.js";
import type { RouteRequest } from "../src/routers/index.js";
import { ScriptedChatModel } from "./fakes/scripted-model.js";
import { decide, fakeDeps, testConfig, type TestAgent } from "./helpers.js";

/** Router: alpha then finish, for `runs` runs; alpha answers from `answers`. */
function setup(
  answers: string[],
  historyLimits: { readonly defaults: number; readonly router?: number },
) {
  const routes = answers.flatMap(() => [decide("alpha"), decide("finish", "done")]);
  const base = fakeDeps({ "test/router": routes });
  const alpha = new ScriptedChatModel(answers);
  const config = {
    ...testConfig,
    defaults: { ...testConfig.defaults, history: { limit: historyLimits.defaults } },
    routers: {
      main: {
        ...testConfig.routers.main,
        ...(historyLimits.router === undefined ? {} : { historyLimit: historyLimits.router }),
      },
    },
  };
  const deps: RunDeps<TestAgent> = {
    ...base,
    config,
    registry: createModelRegistry(config, (settings) =>
      settings.model === "test/alpha" ? alpha : new FakeListChatModel({ responses: ["x"] }),
    ),
  };
  const routed: RouteRequest[] = [];
  const route = deps.router.route;
  vi.spyOn(deps.router, "route").mockImplementation((request) => {
    routed.push(request);
    return route(request);
  });
  return { deps, alpha, routed };
}

const lastHumanText = (model: ScriptedChatModel): string =>
  model.sent.at(-1)?.findLast((message) => message.type === "human")?.text ?? "";

describe("threads and history", () => {
  it("creates a thread on first contact and returns its id", async () => {
    const { deps } = setup(["hello"], { defaults: 2 });

    const result = await runAgent({ task: "Hi" }, deps);

    expect(await deps.terns.hasThread("test-bundle", result.threadId)).toBe(true);
  });

  it("rejects an unknown thread before any call", async () => {
    const { deps, routed } = setup(["never"], { defaults: 2 });

    await expect(runAgent({ task: "Hi", threadId: "ghost" }, deps)).rejects.toBeInstanceOf(
      UnknownThreadError,
    );
    expect(routed).toEqual([]);
  });

  it("shows previous Terns of the thread to the agent", async () => {
    const { deps, alpha } = setup(["Nice to meet you, Pavel.", "Your name is Pavel."], {
      defaults: 2,
    });
    const first = await runAgent({ task: "My name is Pavel" }, deps);

    await runAgent({ task: "What is my name?", threadId: first.threadId }, deps);

    expect(lastHumanText(alpha)).toContain("Q: My name is Pavel\nA: Nice to meet you, Pavel.");
  });

  it("limits history per agent and router", async () => {
    const { deps, alpha, routed } = setup(["a1", "a2", "a3"], { defaults: 1, router: 2 });
    const first = await runAgent({ task: "q1" }, deps);
    await runAgent({ task: "q2", threadId: first.threadId }, deps);

    await runAgent({ task: "q3", threadId: first.threadId }, deps);

    const agentInput = lastHumanText(alpha);
    expect(agentInput).toContain("Q: q2");
    expect(agentInput).not.toContain("Q: q1");
    const routerInput = routed.at(-1)?.input ?? "";
    expect(routerInput).toContain("Q: q1");
    expect(routerInput).toContain("Q: q2");
  });

  it("keeps threads apart", async () => {
    const { deps, alpha } = setup(["secret answer", "other"], { defaults: 5 });
    await runAgent({ task: "secret question" }, deps);

    await runAgent({ task: "Other thread" }, deps);

    expect(lastHumanText(alpha)).not.toContain("secret");
  });
});

describe("formatHistory", () => {
  it("is empty for limit 0 or no turns, and marks non-answered turns", () => {
    expect(formatHistory([{ task: "q", answer: "a", status: "answered" }], 0)).toBe("");
    expect(formatHistory([], 3)).toBe("");
    expect(formatHistory([{ task: "q", answer: "", status: "failed" }], 3)).toContain(
      "A: (failed) ",
    );
  });
});
