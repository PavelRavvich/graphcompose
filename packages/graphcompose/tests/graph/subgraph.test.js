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
import { Agent, Workflow } from "../../src/components/decorators.js";
import { from } from "../../src/router/index.js";
import { WorkflowStart, WorkflowFinish } from "../../src/core/index.js";
import { testWith } from "../../src/testing/test-with.js";
let SubgraphAgent = (() => {
  let _classDecorators = [Agent({ name: "subgraph_agent" })];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var SubgraphAgent = class {
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
      SubgraphAgent = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
    async run() {
      return { payload: { insideSubgraph: true } };
    }
  };
  return (SubgraphAgent = _classThis);
})();
let ChildWorkflow = (() => {
  let _classDecorators = [
    Workflow({
      name: "child_workflow",
      version: "1.0",
      flow: [from(WorkflowStart).next(SubgraphAgent), from(SubgraphAgent).next(WorkflowFinish)],
      defaults: { history: { limit: 5 } },
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var ChildWorkflow = class {
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
      ChildWorkflow = _classThis = _classDescriptor.value;
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
  return (ChildWorkflow = _classThis);
})();
let ParentAgent = (() => {
  let _classDecorators = [Agent({ name: "parent_agent" })];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var ParentAgent = class {
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
      ParentAgent = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
    async run() {
      return { payload: { inParent: true } };
    }
  };
  return (ParentAgent = _classThis);
})();
let ParentWorkflow = (() => {
  let _classDecorators = [
    Workflow({
      name: "parent_workflow",
      version: "1.0",
      flow: [
        from(WorkflowStart).next(ParentAgent),
        from(ParentAgent).next(ChildWorkflow),
        from(ChildWorkflow).next(WorkflowFinish),
      ],
      defaults: { history: { limit: 5 } },
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var ParentWorkflow = class {
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
      ParentWorkflow = _classThis = _classDescriptor.value;
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
  return (ParentWorkflow = _classThis);
})();
describe("Nested Workflows (Subgraphs)", () => {
  it("executes subgraph and merges payload", async () => {
    await testWith(ParentWorkflow, async (app) => {
      const res = await app.run({});
      expect(res.status).toBe("completed");
      const path = res.path;
      // start -> parent_agent -> child_workflow -> finish
      expect(path).toContain("parent_agent");
      expect(path).toContain("child_workflow");
      // Payload should merge
      expect(res.replyWith.payload).toMatchObject({
        inParent: true,
        insideSubgraph: true,
      });
      // Steps should include the subgraph's steps!
      expect(res.path.length).toBeGreaterThan(0);
    });
  });
});
