import { describe, expect, it } from "vitest";
import { checkFlow } from "../../src/graph/check-flow.js";
import { chain, from, node, Self, type Flow } from "../../src/graph/flow.js";
import { GraphRuleError, type RuleCode } from "../../src/graph/rule-error.js";
import { codeReviewFlow } from "./fixtures/code-review.js";
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

  it("a router with one route and a conclusion reached from two routers assemble", () => {
    const flow: Flow = [
      from(Start).to(Second),
      from(Second).choose(A, Done),
      from(A).to(Only),
      from(Only).choose(Done),
    ];

    expect(checkFlow(flow).next.get("only")).toEqual({
      kind: "choose",
      targets: ["done"],
      self: false,
    });
  });

  it.each<[RuleCode, Flow]>([
    ["graph.not-a-node", [from(Start).to(SomeTool)]],
    ["graph.two-next-steps", [from(Start).to(A), from(A).to(Done), from(A).to(OtherDone)]],
    ["graph.choose-from-non-router", [from(Start).to(A), from(A).choose(Done)]],
    ["graph.router-not-last-in-chain", [chain(Start, Pick, A), from(A).to(Done), from(B).to(Done)]],
    ["graph.cycle-without-router", [from(Start).to(A), from(A).to(B), from(B).to(A)]],
    [
      "graph.duplicate-node",
      [from(Start).to(A), from(A).to(AlsoNamedA), from(AlsoNamedA).to(Done)],
    ],
    ["graph.no-entry", [from(A).to(Done)]],
    ["graph.unreachable-node", [from(Start).to(Done), from(A).to(Done)]],
    ["graph.dead-end", [from(Start).to(A)]],
    ["graph.next-after-conclusion", [from(Start).to(Done), from(Done).to(OtherDone)]],
    [
      "router.routes-mismatch",
      [from(Start).to(Pick), from(Pick).choose(A, Done), from(A).to(Done)],
    ],
    ["router.self-without-agent-before", [from(Start).to(Gate), from(Gate).choose(Self, Done)]],
  ])("%s", (code, flow) => {
    expect(codesOf(flow)).toContain(code);
  });

  it("graph.duplicate-node-name: one node name declared twice", () => {
    const first = node(B, "again");
    const second = node(OtherA, "again");

    expect(codesOf([from(Start).to(first), from(first).to(Done), from(second).to(Done)])).toContain(
      "graph.duplicate-node-name",
    );
  });

  it("router texts: a router needs a prompt and every route a text", () => {
    const flow: Flow = [from(Start).to(Mute), from(Mute).choose(A, Done), from(A).to(Done)];

    expect(codesOf(flow)).toEqual([
      "router.no-prompt",
      "router.empty-route-text",
      "router.empty-route-text",
    ]);
  });

  it("reports several violations together, naming the classes involved", () => {
    const error = violationsOf([
      from(Start).to(Pick),
      from(Pick).choose(A),
      from(A).to(B),
      from(B).to(A),
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
      from(Start).to(Pick),
      from(Pick).choose(A, B),
      from(A, B).to(Gate),
      from(Gate).choose(Self, Done),
    ];

    expect(checkFlow(flow).next.get("gate")).toEqual({
      kind: "choose",
      targets: ["done"],
      self: true,
    });
  });

  it("a route to a class outside the flow is a mismatch", () => {
    const flow: Flow = [from(Start).to(Second), from(Second).choose(Done)];

    expect(violationsOf(flow).violations[0]?.message).toContain("routes not in its choose(...): A");
  });
});
