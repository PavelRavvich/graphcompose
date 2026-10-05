import { describe, expect, it } from "vitest";
import { checkFlow } from "../../src/graph/check-flow.js";
import { chain, from, node, Self, type Flow } from "../../src/graph/flow.js";
import { GraphRuleError, type RuleCode } from "../../src/graph/rule-error.js";
import { codeReviewFlow } from "./fixtures/code-review.js";
import { testNode } from "./fixtures/nodes.js";
import {
  A,
  AlsoNamedA,
  B,
  Done,
  Gate,
  Mute,
  Only,
  OtherA,
  OtherDone,
  Pick,
  Second,
  SomeTool,
  Start,
} from "./fixtures/rule-nodes.js";

function violationsOf(flow: Flow): GraphRuleError {
  try {
    checkFlow(flow);
  } catch (error) {
    if (error instanceof GraphRuleError) return error;
    throw error;
  }
  throw new Error("expected a GraphRuleError");
}

const codesOf = (flow: Flow): RuleCode[] => violationsOf(flow).violations.map((item) => item.code);

describe("AC1: assembly rules", () => {
  it("a valid flow assembles (the code-review shape)", () => {
    expect(checkFlow(codeReviewFlow).nodes.size).toBe(8);
  });

  it("a router with one route and a workflow finish reached from two routers assemble", () => {
    const flow: Flow = [
      from(Start).next(Second),
      from(Second).routeOne(A, Done),
      from(A).next(Only),
      from(Only).routeOne(Done),
    ];

    expect(checkFlow(flow).next.get("only")).toEqual({
      kind: "choose",
      targets: ["done"],
      self: false,
      skip: false,
    });
  });

  it.each<[RuleCode, Flow]>([
    ["graph.not-a-node", [from(Start).next(SomeTool)]],
    ["graph.two-next-steps", [from(Start).next(A), from(A).next(Done), from(A).next(OtherDone)]],
    ["graph.choose-from-non-router", [from(Start).next(A), from(A).routeOne(Done)]],
    ["graph.router-not-last-in-chain", [chain(Start, Pick, A), from(A).next(Done), from(B).next(Done)]],
    ["graph.cycle-without-router", [from(Start).next(A), from(A).next(B), from(B).next(A)]],
    [
      "graph.duplicate-node",
      [from(Start).next(A), from(A).next(AlsoNamedA), from(AlsoNamedA).next(Done)],
    ],
    ["graph.no-workflow-start", [from(A).next(Done)]],
    ["graph.unreachable-node", [from(Start).next(Done), from(A).next(Done)]],
    ["graph.dead-end", [from(Start).next(A)]],
    ["graph.next-after-workflow-finish", [from(Start).next(Done), from(Done).next(OtherDone)]],
    [
      "router.routes-mismatch",
      [from(Start).next(Pick), from(Pick).routeOne(A, Done), from(A).next(Done)],
    ],
    ["router.self-without-agent-before", [from(Start).next(Gate), from(Gate).routeOne(Self, Done)]],
  ])("%s", (code, flow) => {
    expect(codesOf(flow)).toContain(code);
  });

  it("graph.duplicate-node-name: one node name declared twice", () => {
    const first = node(B, "again");
    const second = node(OtherA, "again");

    expect(codesOf([from(Start).next(first), from(first).next(Done), from(second).next(Done)])).toContain(
      "graph.duplicate-node-name",
    );
  });

  it("router texts: a router needs a prompt and every route a text", () => {
    const flow: Flow = [from(Start).next(Mute), from(Mute).routeOne(A, Done), from(A).next(Done)];

    expect(codesOf(flow)).toEqual([
      "router.no-prompt",
      "router.empty-route-text",
      "router.empty-route-text",
    ]);
  });

  it("reports several violations together, naming the classes involved", () => {
    const error = violationsOf([
      from(Start).next(Pick),
      from(Pick).routeOne(A),
      from(A).next(B),
      from(B).next(A),
    ]);

    expect(error.violations.map((item) => item.code)).toEqual([
      "graph.cycle-without-router",
      "router.routes-mismatch",
    ]);
    expect(error.violations[0]?.nodes).toEqual(["A", "B"]);
    expect(error.violations[1]?.nodes).toEqual(["Pick", "B"]);
    expect(error.message).toContain("breaks 2 rule(s)");
    expect(error.message).toContain("[router.routes-mismatch] router Pick");
  });

  it("Self after two different agents is allowed", () => {
    const flow: Flow = [
      from(Start).next(Pick),
      from(Pick).routeOne(A, B),
      from(A, B).next(Gate),
      from(Gate).routeOne(Self, Done),
    ];

    expect(checkFlow(flow).next.get("gate")).toEqual({
      kind: "choose",
      targets: ["done"],
      self: true,
      skip: false,
    });
  });

  it("a route to a class outside the flow is a mismatch", () => {
    const flow: Flow = [from(Start).next(Second), from(Second).routeOne(Done)];

    expect(violationsOf(flow).violations[0]?.message).toContain("routes not in its choose(...): A");
  });
});

@testNode("workflow-start", "done")
class StartNamedDone {}

@testNode("workflow-start", "start")
class AlsoNamedStart {}

describe("#141 AC2: workflow start and workflow finish rules", () => {
  it("a flow without a workflow start fails with graph.no-workflow-start", () => {
    const error = violationsOf([from(A).next(Done)]);

    expect(error.violations[0]).toMatchObject({
      code: "graph.no-workflow-start",
      message: "the flow has no workflow start (@WorkflowStart)",
    });
  });

  it("a node after a workflow finish fails with graph.next-after-workflow-finish", () => {
    const error = violationsOf([from(Start).next(Done), from(Done).next(OtherDone)]);

    expect(error.violations[0]).toMatchObject({
      code: "graph.next-after-workflow-finish",
      message: "workflow finish Done has a next step — a workflow finish ends the run",
    });
  });

  it("a path that never reaches a workflow finish is a dead end", () => {
    expect(violationsOf([from(Start).next(A)]).violations[0]?.message).toBe(
      "A has no next step and is not a workflow finish",
    );
  });

  it("a workflow start and a workflow finish may share a name; two starts may not", () => {
    const model = checkFlow([from(StartNamedDone).next(A), from(A).next(Done)]);

    expect([...model.nodes.keys()]).toEqual(["workflow-start.done", "a", "done"]);
    expect(codesOf([from(Start, AlsoNamedStart).next(A), from(A).next(Done)])).toContain(
      "graph.duplicate-node",
    );
  });
});
