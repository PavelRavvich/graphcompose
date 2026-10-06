import { describe, expect, it } from "vitest";
import type { ExecutionOutput } from "../../src/app/types.js";
import { buildCostReport } from "../../src/finops/usage.js";
import { AgentFailedError } from "../../src/graph/errors.js";
import { GraphRuleError, LimitExceededError, RouterDecisionError } from "../../src/graph/index.js";
import { answer, callTool, decide, TestFailure, testWith } from "../../src/testing/index.js";
import {
  ChatStart,
  Desk,
  MainRouter,
  OrderStatus,
  ReadNote,
  Reply,
  Support,
  Writer,
} from "./fixtures/desk.workflow.js";

const run = (parts: Partial<ExecutionOutput>): ExecutionOutput => ({
  thread: "thread-1",
  status: "answered",
  answer: "Hi.",
  route: ["writer"],
  stopReason: "done",
  path: [ChatStart, MainRouter, Writer, MainRouter, Reply],
  spend: buildCostReport([]),
  finish: "reply",
  output: { text: "Hi." },
  ...parts,
});

const paused = run({
  status: "paused",
  path: [ChatStart, MainRouter, Support],
  finish: undefined,
  output: undefined,
  pending: { agent: "support", callId: "call-1", tool: "save_note", args: {} },
});

describe("AC12: matchers by class — a passing and a failing case, readable failures", () => {
  it("toFollowPath compares the visited nodes in order", () => {
    expect(run({})).toFollowPath([ChatStart, MainRouter, Writer, MainRouter, Reply]);
    expect(run({})).not.toFollowPath([ChatStart, MainRouter, Support, MainRouter, Reply]);
    expect(() => {
      expect(run({})).toFollowPath([ChatStart, MainRouter, Support]);
    }).toThrow(
      "expected the path ChatStart → MainRouter → Support, it was ChatStart → MainRouter → Writer → MainRouter → Reply",
    );
  });

  it("toFinishWith names the finish class and its data", () => {
    expect(run({})).toFinishWith(Reply);
    expect(run({})).toFinishWith(Reply, { text: "Hi." });
    expect(() => {
      expect(run({})).toFinishWith(Reply, { text: "Bye." });
    }).toThrow('expected the run to finish at Reply with {"text":"Bye."}, it finished at "reply"');
    expect(() => {
      expect(paused).toFinishWith(Reply);
    }).toThrow('expected the run to finish at Reply, it paused at "support"');
  });

  it("toHavePausedAt names the agent the run waits in", () => {
    expect(paused).toHavePausedAt(Support);
    expect(() => {
      expect(paused).toHavePausedAt(Writer);
    }).toThrow('expected the run to pause at Writer, it paused at "support"');
    expect(() => {
      expect(run({ finish: undefined, status: "guarded" })).toHavePausedAt(Writer);
    }).toThrow("it ended guarded without a finish");
  });

  it("toFailWith reads codes and nodes of the error and its causes", () => {
    const router = new RouterDecisionError("main", "router.failed", "timeout", []);
    const limit = new LimitExceededError(
      { key: "limits.perDay.cost", limit: 1, actual: 2 },
      ["writer"],
      2,
    );
    const agent = new AgentFailedError("writer", [], new TestFailure("test.script-exhausted", "x"));
    const rules = new GraphRuleError([{ code: "graph.dead-end", message: "x", nodes: ["Writer"] }]);

    expect(router).toFailWith({ code: "router.failed", node: MainRouter });
    expect(limit).toFailWith({ code: "limits.perDay.cost", node: Writer });
    expect(agent).toFailWith({ code: "test.script-exhausted", node: Writer });
    expect(rules).toFailWith({ code: "graph.dead-end", node: Writer });
    expect(() => {
      expect(router).toFailWith({ code: "router.unknown-route", node: Writer });
    }).toThrow(
      'expected a failure router.unknown-route at Writer, got RouterDecisionError: Router "main" [router.failed]: timeout',
    );
    expect(() => {
      expect("no error").toFailWith({});
    }).toThrow("expected a failure, got no error");
  });

  it("the run matchers want a run result", () => {
    expect(() => {
      expect({}).toFollowPath([]);
    }).toThrow("toFollowPath: expected a run result (app.execute / app.resume)");
    expect(() => {
      expect({}).toFinishWith(Reply);
    }).toThrow("toFinishWith: expected a run result");
    expect(() => {
      expect({}).toHavePausedAt(Support);
    }).toThrow("toHavePausedAt: expected a run result");
    expect(() => {
      expect(run({})).toHaveCalledTools([]);
    }).toThrow("toHaveCalledTools: expected modelOf(…) of an agent or a router");
    expect(() => {
      expect(run({})).toHaveBeenAskedWith({});
    }).toThrow("toHaveBeenAskedWith: expected modelOf(…)");
  });
});

const test = testWith(Desk);

describe("AC12: matchers on modelOf(…)", () => {
  test("toHaveCalledTools and toHaveBeenAskedWith name the class", async ({ app, modelOf }) => {
    modelOf(MainRouter).respond(decide(Support), decide(Reply));
    modelOf(Support).respond(callTool(OrderStatus, { orderId: "5" }), answer("Shipped."));

    await app.execute(ChatStart, { text: "where is 5?" });

    expect(modelOf(Support)).toHaveCalledTools([OrderStatus]);
    expect(modelOf(Writer)).toHaveCalledTools([]);
    expect(() => {
      expect(modelOf(Support)).toHaveCalledTools([ReadNote]);
    }).toThrow("expected Support to call read_note, it called order_status");
    expect(modelOf(Support)).toHaveBeenAskedWith({ kind: "chat", input: "where is 5?" });
    expect(modelOf(Support)).not.toHaveBeenAskedWith({ input: "where is 6?" });
    expect(() => {
      expect(modelOf(Writer)).toHaveBeenAskedWith({ input: "x" });
    }).toThrow('expected Writer to be asked with {"input":"x"}, its requests: []');
  });
});
