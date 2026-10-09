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
import { extractText } from "../../src/graph/multimodal.js";
import { describe, expect, it } from "vitest";
import {
  assembleFlowGraph,
  graphNodeId,
  UnknownWorkflowStartError,
} from "../../src/graph/build.js";
import { from, Self } from "../../src/graph/flow.js";
import { Router } from "../../src/graph/router.decorator.js";
import { codeReviewFlow } from "./fixtures/code-review.js";
import { scriptedRouter, testNode, testRuntime } from "./fixtures/nodes.js";
import { A, B, Done, Start } from "./fixtures/rule-nodes.js";
let WebhookWorkflowStart = (() => {
  let _classDecorators = [testNode("workflow-start", "webhook")];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var WebhookWorkflowStart = class {
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
      WebhookWorkflowStart = _classThis = _classDescriptor.value;
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
  return (WebhookWorkflowStart = _classThis);
})();
let Spin = (() => {
  let _classDecorators = [
    Router({
      name: "spin",
      description: "Loops back to the agent",
      prompt: "Again?",
      model: "typesafe/jev-1.13",
      maxVisits: 25,
      routes: [
        { prompt: "Once more", target: Self },
        { prompt: "Enough", target: Done },
      ],
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Spin = class {
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
      Spin = _classThis = _classDescriptor.value;
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
  return (Spin = _classThis);
})();
let Star = (() => {
  let _classDecorators = [
    Router({
      name: "star",
      description: "Sends the message to an agent, or sends the replyWith",
      prompt: "Pick who handles the message.",
      model: "typesafe/jev-1.13",
      maxVisits: 3,
      routes: [
        { prompt: "A work", target: A },
        { prompt: "B work", target: B },
        { prompt: "The replyWith covers it", target: Done },
      ],
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Star = class {
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
      Star = _classThis = _classDescriptor.value;
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
  return (Star = _classThis);
})();
/** The job-scout shape: workflow start → router star → agent → router again → … → workflow finish. */
const starFlow = [from(Start).next(Star), from(Star).routes(A, B, Done), from(A, B).next(Star)];
const twoStarts = [from(Start, WebhookWorkflowStart).next(A), from(A).next(Done)];
describe("AC1: the flow runs as a LangGraph graph", () => {
  it("runs the code-review shape from workflow start to workflow finish, through the gate-router cycle", async () => {
    const routers = {
      main: scriptedRouter("main", ["coder"]),
      "review-gate": scriptedRouter("review-gate", ["coder", "pull-request"]),
    };
    const { graph } = await assembleFlowGraph(codeReviewFlow, testRuntime(routers));
    const state = await graph.invoke({ task: "add a feature" });
    expect(state.path).toEqual([
      "workflow-start.chat",
      "main",
      "coder",
      "reviewer",
      "review-gate",
      "coder",
      "reviewer",
      "review-gate",
      "pull-request",
    ]);
    expect(state.replyWith).toBe("reviewer answered");
    expect(state.steps).toBe(7);
    expect(state.visits).toMatchObject({
      coder: 2,
      "review-gate": 2,
      "workflow-start.chat": 1,
      "pull-request": 1,
    });
  });
  it("runs a star: the router sends to agents and back until it sends the replyWith", async () => {
    const star = scriptedRouter("star", ["a", "b", "done"]);
    const { graph } = await assembleFlowGraph(starFlow, testRuntime({ star }));
    const state = await graph.invoke({ task: "find jobs" });
    expect(state.path).toEqual(["workflow-start.start", "star", "a", "star", "b", "star", "done"]);
    expect(state.replyWith).toBe("b answered");
    expect(
      star.requests.map((request) => extractText(request.input).includes("[a]\na answered")),
    ).toEqual([false, true, true]);
  });
  it("#141 AC2: one graph node per flow node, named <kind>.<name>", async () => {
    const routers = { main: scriptedRouter("main", []), "review-gate": scriptedRouter("g", []) };
    const { graph } = await assembleFlowGraph(codeReviewFlow, testRuntime(routers));
    expect(Object.keys((await graph.getGraphAsync()).nodes).sort()).toEqual([
      "__end__",
      "__start__",
      "agent.coder",
      "agent.explainer",
      "agent.reviewer",
      "router.main",
      "router.review-gate",
      "skip-wrap",
      "workflow-finish.replyWith",
      "workflow-finish.pull-request",
      "workflow-start.chat",
    ]);
    expect(graphNodeId({ kind: "router", name: "main" })).toBe("router.main");
  });
  it("starts at the workflow start named in the input when the flow has several", async () => {
    const { graph } = await assembleFlowGraph(twoStarts, testRuntime({}));
    const state = await graph.invoke({ task: "event", start: "webhook" });
    expect(state.path).toEqual(["workflow-start.webhook", "a", "done"]);
  });
  it("fails on a workflow start the flow does not have", async () => {
    const { graph } = await assembleFlowGraph(twoStarts, testRuntime({}));
    await expect(graph.invoke({ task: "event", start: "ghost" })).rejects.toBeInstanceOf(
      UnknownWorkflowStartError,
    );
  });
  it("runs past LangGraph's default recursion limit when the steps limit allows it", async () => {
    const flow = [from(Start).next(A), from(A).next(Spin), from(Spin).routes(Self, Done)];
    const spin = scriptedRouter("spin", [...Array(20).fill("self"), "done"]);
    const built = await assembleFlowGraph(
      flow,
      testRuntime({ spin }, { limits: { perRun: { steps: 60 } } }),
    );
    const state = await built.graph.invoke({ task: "loop" });
    expect(state.steps).toBe(42);
    expect(built.recursionLimit).toBeGreaterThan(60);
  });
});
