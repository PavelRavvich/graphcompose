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
import { WorkflowStartText, WorkflowFinishText } from "../../../src/dto/index.js";
import { WorkflowFinish } from "../../../src/graph/workflow-finish.decorator.js";
import { WorkflowStart } from "../../../src/graph/workflow-start.decorator.js";
import { from } from "../../../src/graph/flow.js";
import { Router } from "../../../src/graph/router.decorator.js";
import { recordNode } from "../../../src/graph/node-kind.js";
/** A bare agent node (the test config holds its settings). */
const agentNode = (name) => (value) => {
  recordNode(value, { kind: "agent", name });
  return value;
};
let TestChat = (() => {
  let _classDecorators = [
    WorkflowStart({
      name: "chat",
      description: "A message from the user",
      input: WorkflowStartText,
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var TestChat = class {
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
      TestChat = _classThis = _classDescriptor.value;
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
  return (TestChat = _classThis);
})();
export { TestChat };
let Alpha = (() => {
  let _classDecorators = [agentNode("alpha")];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Alpha = class {
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
      Alpha = _classThis = _classDescriptor.value;
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
  return (Alpha = _classThis);
})();
export { Alpha };
let Beta = (() => {
  let _classDecorators = [agentNode("beta")];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Beta = class {
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
      Beta = _classThis = _classDescriptor.value;
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
  return (Beta = _classThis);
})();
export { Beta };
let TestAnswer = (() => {
  let _classDecorators = [
    WorkflowFinish({
      name: "replyWith",
      description: "The replyWith to the user",
      output: WorkflowFinishText,
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var TestAnswer = class {
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
      TestAnswer = _classThis = _classDescriptor.value;
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
  return (TestAnswer = _classThis);
})();
export { TestAnswer };
const ROUTES = {
  alpha: "Handles alpha work",
  beta: "Handles beta work",
  replyWith: "The contributions so far replyWith the task",
};
/** The test workflows' main router: an LLM ("test/router") so tests script it with fake chat models. */
let TestMain = (() => {
  let _classDecorators = [
    Router({
      name: "main",
      description: "Sends the task to an agent, or sends the replyWith",
      prompt: "Pick who handles the task.",
      model: "test/router",
      maxVisits: 10,
      routes: [
        { prompt: ROUTES.alpha, target: Alpha },
        { prompt: ROUTES.beta, target: Beta },
        { prompt: ROUTES.replyWith, target: TestAnswer },
      ],
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var TestMain = class {
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
      TestMain = _classThis = _classDescriptor.value;
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
  return (TestMain = _classThis);
})();
export { TestMain };
/** The star: workflow start → main router → alpha / beta → main again → … → replyWith. */
export const testFlow = [
  from(TestChat).next(TestMain),
  from(TestMain).routes(Alpha, Beta, TestAnswer),
  from(Alpha, Beta).next(TestMain),
];
/** `TestMain` as assembly loads it (routes sorted by name). */
export const testRouters = [
  {
    name: "main",
    description: "Sends the task to an agent, or sends the replyWith",
    model: "test/router",
    instructions: async () => "Pick who handles the task.",
    routes: [
      { option: "alpha", condition: async () => ROUTES.alpha },
      { option: "replyWith", condition: async () => ROUTES.replyWith },
      { option: "beta", condition: async () => ROUTES.beta },
    ],
  },
];
