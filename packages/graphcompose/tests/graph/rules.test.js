var __esDecorate =
  (this && this.__esDecorate) ||
  function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) {
      if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
      return f;
    }
    var kind = contextIn.kind,
      key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? (contextIn["static"] ? ctor : ctor.prototype) : null;
    var descriptor =
      descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _,
      done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
      var context = {};
      for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
      for (var p in contextIn.access) context.access[p] = contextIn.access[p];
      context.addInitializer = function (f) {
        if (done) throw new TypeError("Cannot add initializers after decoration has completed");
        extraInitializers.push(accept(f || null));
      };
      var result = (0, decorators[i])(
        kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key],
        context,
      );
      if (kind === "accessor") {
        if (result === void 0) continue;
        if (result === null || typeof result !== "object") throw new TypeError("Object expected");
        if ((_ = accept(result.get))) descriptor.get = _;
        if ((_ = accept(result.set))) descriptor.set = _;
        if ((_ = accept(result.init))) initializers.unshift(_);
      } else if ((_ = accept(result))) {
        if (kind === "field") initializers.unshift(_);
        else descriptor[key] = _;
      }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
  };
var __runInitializers =
  (this && this.__runInitializers) ||
  function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
      value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
  };
import { describe, expect, it } from "vitest";
import { checkFlow } from "../../src/graph/check-flow.js";
import { chain, from, node, Self } from "../../src/graph/flow.js";
import { GraphRuleError } from "../../src/graph/rule-error.js";
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
function violationsOf(flow) {
  try {
    checkFlow(flow);
  } catch (error) {
    if (error instanceof GraphRuleError) return error;
    throw error;
  }
  throw new Error("expected a GraphRuleError");
}
const codesOf = (flow) => violationsOf(flow).violations.map((item) => item.code);
describe("AC1: assembly rules", () => {
  it("a valid flow assembles (the code-review shape)", () => {
    expect(checkFlow(codeReviewFlow).nodes.size).toBe(8);
  });
  it("a router with one route and a workflow finish reached from two routers assemble", () => {
    const flow = [
      from(Start).next(Second),
      from(Second).routes(A, Done),
      from(A).next(Only),
      from(Only).routes(Done),
    ];
    expect(checkFlow(flow).next.get("only")).toEqual({
      kind: "choose",
      targets: ["done"],
      self: false,
      end: false,
      return: false,
      optionNames: ["done"],
      parallelTargets: [],
    });
  });
  it.each([
    ["graph.not-a-node", [from(Start).next(SomeTool)]],
    ["graph.two-next-steps", [from(Start).next(A), from(A).next(Done), from(A).next(OtherDone)]],
    ["graph.choose-from-non-router", [from(Start).next(A), from(A).routes(Done)]],
    [
      "graph.router-not-last-in-chain",
      [chain(Start, Pick, A), from(A).next(Done), from(B).next(Done)],
    ],
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
      [from(Start).next(Pick), from(Pick).routes(A, Done), from(A).next(Done)],
    ],
    ["router.self-without-agent-before", [from(Start).next(Gate), from(Gate).routes(Self, Done)]],
  ])("%s", (code, flow) => {
    expect(codesOf(flow)).toContain(code);
  });
  it("graph.duplicate-node-name: one node name declared twice", () => {
    const first = node(B, "again");
    const second = node(OtherA, "again");
    expect(
      codesOf([from(Start).next(first), from(first).next(Done), from(second).next(Done)]),
    ).toContain("graph.duplicate-node-name");
  });
  it("router texts: a router needs a prompt and every route a text", () => {
    const flow = [from(Start).next(Mute), from(Mute).routes(A, Done), from(A).next(Done)];
    expect(codesOf(flow)).toEqual([
      "router.no-prompt",
      "router.empty-route-text",
      "router.empty-route-text",
    ]);
  });
  it("reports several violations together, naming the classes involved", () => {
    const error = violationsOf([
      from(Start).next(Pick),
      from(Pick).routes(A),
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
    const flow = [
      from(Start).next(Pick),
      from(Pick).routes(A, B),
      from(A, B).next(Gate),
      from(Gate).routes(Self, Done),
    ];
    expect(checkFlow(flow).next.get("gate")).toEqual({
      kind: "choose",
      targets: ["done"],
      self: true,
      end: false,
      return: false,
      optionNames: ["done"],
      parallelTargets: [],
    });
  });
  it("a route to a class outside the flow is a mismatch", () => {
    const flow = [from(Start).next(Second), from(Second).routes(Done)];
    expect(violationsOf(flow).violations[0]?.message).toContain("routes not in its choose(...): A");
  });
});
let StartNamedDone = (() => {
  let _classDecorators = [testNode("workflow-start", "done")];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var StartNamedDone = class {
    static {
      _classThis = this;
    }
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
      __esDecorate(
        null,
        (_classDescriptor = { value: _classThis }),
        _classDecorators,
        { kind: "class", name: _classThis.name, metadata: _metadata },
        null,
        _classExtraInitializers,
      );
      StartNamedDone = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
  };
  return (StartNamedDone = _classThis);
})();
let AlsoNamedStart = (() => {
  let _classDecorators = [testNode("workflow-start", "start")];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var AlsoNamedStart = class {
    static {
      _classThis = this;
    }
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
      __esDecorate(
        null,
        (_classDescriptor = { value: _classThis }),
        _classDecorators,
        { kind: "class", name: _classThis.name, metadata: _metadata },
        null,
        _classExtraInitializers,
      );
      AlsoNamedStart = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
  };
  return (AlsoNamedStart = _classThis);
})();
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
