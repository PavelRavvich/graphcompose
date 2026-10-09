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
import { Tool } from "../../../src/tool/index.js";
import { DateTime, TimeZone } from "../../../src/dto/index.js";
import { starOf, TestSettings } from "../test-flow/star.js";
const price = { inputPerMTok: 0.5, outputPerMTok: 3, cacheReadPerMTok: 0.1 };
let ClockQuery = (() => {
  let _timeZone_decorators;
  let _timeZone_initializers = [];
  let _timeZone_extraInitializers = [];
  return class ClockQuery {
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
      _timeZone_decorators = [
        TimeZone({ prompt: "IANA time zone, e.g. Asia/Tokyo", default: "UTC" }),
      ];
      __esDecorate(
        null,
        null,
        _timeZone_decorators,
        {
          kind: "field",
          name: "timeZone",
          static: false,
          private: false,
          access: {
            has: (obj) => "timeZone" in obj,
            get: (obj) => obj.timeZone,
            set: (obj, value) => {
              obj.timeZone = value;
            },
          },
          metadata: _metadata,
        },
        _timeZone_initializers,
        _timeZone_extraInitializers,
      );
      if (_metadata)
        Object.defineProperty(this, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
    }
    timeZone = __runInitializers(this, _timeZone_initializers, void 0);
    constructor() {
      __runInitializers(this, _timeZone_extraInitializers);
    }
  };
})();
let ClockTime = (() => {
  let _iso_decorators;
  let _iso_initializers = [];
  let _iso_extraInitializers = [];
  let _timeZone_decorators;
  let _timeZone_initializers = [];
  let _timeZone_extraInitializers = [];
  return class ClockTime {
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
      _iso_decorators = [DateTime()];
      _timeZone_decorators = [TimeZone()];
      __esDecorate(
        null,
        null,
        _iso_decorators,
        {
          kind: "field",
          name: "iso",
          static: false,
          private: false,
          access: {
            has: (obj) => "iso" in obj,
            get: (obj) => obj.iso,
            set: (obj, value) => {
              obj.iso = value;
            },
          },
          metadata: _metadata,
        },
        _iso_initializers,
        _iso_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _timeZone_decorators,
        {
          kind: "field",
          name: "timeZone",
          static: false,
          private: false,
          access: {
            has: (obj) => "timeZone" in obj,
            get: (obj) => obj.timeZone,
            set: (obj, value) => {
              obj.timeZone = value;
            },
          },
          metadata: _metadata,
        },
        _timeZone_initializers,
        _timeZone_extraInitializers,
      );
      if (_metadata)
        Object.defineProperty(this, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
    }
    iso = __runInitializers(this, _iso_initializers, void 0);
    timeZone =
      (__runInitializers(this, _iso_extraInitializers),
      __runInitializers(this, _timeZone_initializers, void 0));
    constructor() {
      __runInitializers(this, _timeZone_extraInitializers);
    }
  };
})();
/** A test tool: the time, from an injected clock. */
let Clock = (() => {
  let _classDecorators = [
    Tool({
      name: "current_time",
      description: "Current date and time in an IANA time zone (default UTC).",
      input: ClockQuery,
      output: ClockTime,
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Clock = class {
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
      Clock = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
    now;
    constructor(now = () => new Date("2026-09-25T10:00:00Z")) {
      this.now = now;
    }
    run({ timeZone }) {
      // an unknown time zone throws — the model sees it as a tool error
      new Intl.DateTimeFormat("en-GB", { timeZone }).format(this.now());
      return Promise.resolve({ iso: this.now().toISOString(), timeZone });
    }
  };
  return (Clock = _classThis);
})();
export { Clock };
let Researcher = (() => {
  let _classDecorators = [
    Agent({
      name: "researcher",
      description: "Finds, explains and summarizes facts",
      model: "test/researcher",
      price,
      tools: [Clock],
      prompt: "./researcher.prompt.md",
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Researcher = class {
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
      Researcher = _classThis = _classDescriptor.value;
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
  return (Researcher = _classThis);
})();
export { Researcher };
let Coder = (() => {
  let _classDecorators = [
    Agent({
      name: "coder",
      description: "Writes, reviews and explains code",
      model: "test/coder",
      price,
      thinking: "low",
      prompt: "./coder.prompt.md",
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Coder = class {
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
      Coder = _classThis = _classDescriptor.value;
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
  return (Coder = _classThis);
})();
export { Coder };
/** The framework's own test workflow (the framework ships no agents). */
let TestWorkflow = (() => {
  let _classDecorators = [
    Workflow({
      name: "test-workflow",
      version: "1.0.0",
      defaults: {
        models: { temperature: 0, maxTokens: MODEL_MAX, thinking: "default", cache: true },
        router: { kind: "jev", model: "typesafe/jev-1.13" },
        tools: { maxToolCalls: 8 },
        history: { limit: 5 },
      },
      guards: {
        input: { prompt_injection: { threshold: 0.7, refusal: "I can't help with that request." } },
        output: { pii: { threshold: 0.7, refusal: "Withheld." } },
      },
      flow: starOf(Researcher, Coder),
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  let _classSuper = TestSettings;
  var TestWorkflow = class extends _classSuper {
    static {
      _classThis = this;
    }
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata
          ? Object.create(_classSuper[Symbol.metadata] ?? null)
          : void 0;
      __esDecorate(
        null,
        (_classDescriptor = { value: _classThis }),
        _classDecorators,
        { kind: "class", name: _classThis.name, metadata: _metadata },
        null,
        _classExtraInitializers,
      );
      TestWorkflow = _classThis = _classDescriptor.value;
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
  return (TestWorkflow = _classThis);
})();
export { TestWorkflow };
