import { describe, expect, it } from "vitest";
import { chain, from, isNamedNode, labelOf, node, Self } from "../../src/graph/flow.js";
import { collectFlow } from "../../src/graph/flow-nodes.js";
import { testNode } from "./fixtures/nodes.js";
import { AnswerConclusion, codeReviewFlow, CoderAgent } from "./fixtures/code-review.js";

@testNode("agent", "a")
class A {}

@testNode("agent", "b")
class B {}

@testNode("router", "r")
class R {}

const transitionsOf = (flow: Parameters<typeof collectFlow>[0]) =>
  collectFlow(flow).transitions.map((t) => ({ from: t.from, next: t.next }));

describe("AC1: flow DSL builds the expected transitions", () => {
  it("from(A).to(B) is one unconditional step", () => {
    expect(transitionsOf([from(A).to(B)])).toEqual([
      { from: "a", next: { kind: "to", target: "b" } },
    ]);
  });

  it("from(A, B).to(C) fans in: one step from each source", () => {
    expect(transitionsOf([from(A, B).to(AnswerConclusion)])).toEqual([
      { from: "a", next: { kind: "to", target: "answer" } },
      { from: "b", next: { kind: "to", target: "answer" } },
    ]);
  });

  it("chain(A, B, C) is from(A).to(B) + from(B).to(C)", () => {
    expect(transitionsOf([chain(A, B, AnswerConclusion)])).toEqual([
      { from: "a", next: { kind: "to", target: "b" } },
      { from: "b", next: { kind: "to", target: "answer" } },
    ]);
  });

  it("from(Router).choose(...) is one choice with every target; Self is kept as a flag", () => {
    expect(transitionsOf([from(R).choose(A, B, Self)])).toEqual([
      { from: "r", next: { kind: "choose", targets: ["a", "b"], self: true } },
    ]);
  });

  it("node(Class, name) is a second place for the same class under its own name", () => {
    const SecondA = node(A, "a-again");

    const collected = collectFlow([from(A).to(SecondA)]);

    expect([...collected.nodes.keys()]).toEqual(["a", "a-again"]);
    expect(collected.nodes.get("a-again")).toMatchObject({ kind: "agent", use: A });
    expect(collected.nameOf(SecondA)).toBe("a-again");
  });

  it("the code-review flow has every node once, with its kind", () => {
    const { nodes } = collectFlow(codeReviewFlow);

    expect([...nodes.values()].map((ref) => `${ref.kind}:${ref.name}`)).toEqual([
      "entry:chat",
      "router:main",
      "agent:explainer",
      "agent:coder",
      "conclusion:answer",
      "agent:reviewer",
      "router:review-gate",
      "conclusion:pull-request",
    ]);
    expect(collectFlow(codeReviewFlow).nameOf(CoderAgent)).toBe("coder");
  });

  it("labels say what a person wrote", () => {
    const named = node(A, "x");

    expect([labelOf(A), labelOf(named), labelOf(Self), isNamedNode(named)]).toEqual([
      "A",
      'node(A, "x")',
      "Self",
      true,
    ]);
  });
});
