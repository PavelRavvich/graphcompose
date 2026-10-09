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
import { Agent, Workflow } from "../../../src/core/index.js";
import { MODEL_MAX } from "../../../src/index.js";
import { WorkflowFinishText, WorkflowStartText } from "../../../src/dto/index.js";
import {
  chain,
  WorkflowFinish,
  WorkflowStart,
  WorkflowSettings,
} from "../../../src/graph/index.js";
import { JevModelProvider } from "../../../src/models/index.js";
import { usd } from "../../../src/units/index.js";
import { LocalModelProvider, TestOpenRouterProvider } from "../providers.fixture.js";
/** Priced by its provider's table (local/llama), no price of its own. */
let Summariser = (() => {
  let _classDecorators = [
    Agent({
      name: "summariser",
      promptUrls: ["./summariser.prompt.md"],
      description: "Summarises the task",
      model: "local/llama",
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Summariser = class {
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
      Summariser = _classThis = _classDescriptor.value;
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
  return (Summariser = _classThis);
})();
export { Summariser };
/** Priced by its provider's replyWith (OpenRouter's usage.cost). */
let Writer = (() => {
  let _classDecorators = [
    Agent({
      name: "writer",
      promptUrls: ["./writer.prompt.md"],
      description: "Writes the replyWith",
      model: "moonshotai/kimi-k2.6",
      thinking: "none",
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Writer = class {
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
      Writer = _classThis = _classDescriptor.value;
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
  return (Writer = _classThis);
})();
export { Writer };
let TaskStart = (() => {
  let _classDecorators = [
    WorkflowStart({ name: "task", description: "A task", input: WorkflowStartText }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var TaskStart = class {
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
      TaskStart = _classThis = _classDescriptor.value;
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
  return (TaskStart = _classThis);
})();
export { TaskStart };
let Answer = (() => {
  let _classDecorators = [
    WorkflowFinish({ name: "replyWith", description: "The replyWith", output: WorkflowFinishText }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Answer = class {
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
      Answer = _classThis = _classDescriptor.value;
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
  return (Answer = _classThis);
})();
export { Answer };
/** A straight line over two providers: a local server with a price table, and OpenRouter. */
let Priced = (() => {
  let _classDecorators = [
    Workflow({
      name: "priced",
      version: "1.0.0",
      flow: [chain(TaskStart, Summariser, Writer, Answer)],
      defaults: {
        models: { temperature: 0, maxTokens: MODEL_MAX },
        router: { kind: "jev", model: "typesafe/jev-1.13" },
        tools: { maxToolCalls: 2 },
        history: { limit: 2 },
      },
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Priced = class {
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
      Priced = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
    settings() {
      return WorkflowSettings.builder()
        .limits({ perRun: { cost: usd(0.05) } })
        .modelProviders([TestOpenRouterProvider, JevModelProvider, LocalModelProvider])
        .defaultModelProvider(LocalModelProvider)
        .build();
    }
  };
  return (Priced = _classThis);
})();
export { Priced };
