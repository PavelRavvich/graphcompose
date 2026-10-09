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
import { describe, it, expect, vi } from "vitest";
import { Workflow, Agent, WorkflowAction } from "../../src/components/decorators.js";
import { from, catchError } from "../../src/graph/flow.js";
import { SagaOrchestrator } from "../../src/core/saga.js";
import { testWith } from "../../src/testing/test-with.js";
const compensationFn = vi.fn();
const actionCompensationFn = vi.fn();
const failingActionFn = vi.fn();
let CancelFlightAgent = (() => {
  let _classDecorators = [Agent({ name: "CancelFlightAgent", prompt: "Cancel flight" })];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var CancelFlightAgent = class {
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
      CancelFlightAgent = _classThis = _classDescriptor.value;
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
  return (CancelFlightAgent = _classThis);
})();
let BookFlightAgent = (() => {
  let _classDecorators = [
    Agent({ name: "BookFlightAgent", prompt: "Book flight", compensate: CancelFlightAgent }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var BookFlightAgent = class {
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
      BookFlightAgent = _classThis = _classDescriptor.value;
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
  return (BookFlightAgent = _classThis);
})();
let CancelHotelAction = (() => {
  let _classDecorators = [WorkflowAction({ name: "CancelHotelAction" })];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var CancelHotelAction = class {
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
      CancelHotelAction = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
    execute() {
      actionCompensationFn();
      return {};
    }
  };
  return (CancelHotelAction = _classThis);
})();
let BookHotelAction = (() => {
  let _classDecorators = [
    WorkflowAction({ name: "BookHotelAction", compensate: CancelHotelAction }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var BookHotelAction = class {
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
      BookHotelAction = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
    execute() {
      return {};
    }
  };
  return (BookHotelAction = _classThis);
})();
let FailingAction = (() => {
  let _classDecorators = [WorkflowAction({ name: "FailingAction" })];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var FailingAction = class {
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
      FailingAction = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
    execute() {
      failingActionFn();
      throw new Error("Failing");
    }
  };
  return (FailingAction = _classThis);
})();
let SagaTestWorkflow = (() => {
  let _classDecorators = [
    Workflow({
      name: "SagaTestWorkflow",
      flow: [
        from(BookFlightAgent).next(BookHotelAction),
        from(BookHotelAction).next(FailingAction),
        catchError(FailingAction, Error).next(SagaOrchestrator),
        from(SagaOrchestrator).next("end"),
      ],
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var SagaTestWorkflow = class {
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
      SagaTestWorkflow = _classThis = _classDescriptor.value;
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
  return (SagaTestWorkflow = _classThis);
})();
describe("Saga Orchestrator", () => {
  it("should rollback agents and actions in reverse order", async () => {
    await testWith(SagaTestWorkflow, async ({ app, when, replyWith }) => {
      when(BookFlightAgent).thenAnswer(() => replyWith("Flight booked"));
      when(CancelFlightAgent).thenAnswer(() => {
        compensationFn();
        return replyWith("Flight canceled");
      });
      const res = await app.invoke({ task: "Book my trip" });
      expect(failingActionFn).toHaveBeenCalled();
      expect(actionCompensationFn).toHaveBeenCalled(); // Hotel canceled
      expect(compensationFn).toHaveBeenCalled(); // Flight canceled
      // Ensure error is cleared by SAGA
      expect(res.lastError).toBeNull();
    });
  });
});
