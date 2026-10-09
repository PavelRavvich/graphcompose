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
import {
  CachedPart,
  CacheRetention,
  EnvironmentVariable,
  ModelCost,
  ModelFailure,
  ModelProvider,
  OpenAiCompatibleProvider,
  OpenRouterProvider,
  PromptCaching,
  Reasoning,
  RetryPolicy,
} from "../../src/models/index.js";
import { minutes, seconds, usd } from "../../src/units/index.js";
const breaker = { failureThreshold: 3, window: minutes(1), openFor: seconds(30) };
/** A backup OpenAI-compatible server: the fallback while OpenRouter's breaker is open. */
let BackupModelProvider = (() => {
  let _classDecorators = [
    ModelProvider({
      name: "backup",
      description: "A backup server",
      serves: [/^backup\//],
      baseUrl: "http://backup.test/v1",
      apiKey: EnvironmentVariable.named("BACKUP_KEY", { secret: true, defaultValue: "backup-key" }),
      timeout: seconds(5),
      cost: ModelCost.fromResponse(),
      reasoning: Reasoning.modelDecides(),
      promptCaching: PromptCaching.off(),
      retryPolicy: RetryPolicy.none(),
      circuitBreakerPolicy: breaker,
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  let _classSuper = OpenAiCompatibleProvider;
  var BackupModelProvider = class extends _classSuper {
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
      BackupModelProvider = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
    requestFields = {};
  };
  return (BackupModelProvider = _classThis);
})();
export { BackupModelProvider };
/** job-scout's OpenRouter: serves every model, ignores one upstream provider. */
let TestOpenRouterProvider = (() => {
  let _classDecorators = [
    ModelProvider({
      name: "openrouter",
      description: "OpenRouter",
      serves: [/.*/],
      baseUrl: "http://openrouter.test/api/v1",
      apiKey: EnvironmentVariable.named("OPENROUTER_API_KEY", { secret: true }),
      timeout: minutes(2),
      cost: ModelCost.fromResponse(),
      reasoning: Reasoning.modelDecides(),
      promptCaching: PromptCaching.whereSupported({
        retention: CacheRetention.FiveMinutes,
        cachedParts: [CachedPart.SystemPrompt, CachedPart.Tools, CachedPart.History],
      }),
      retryPolicy: RetryPolicy.exponential({
        maxAttempts: 3,
        initialDelay: seconds(1),
        maxDelay: seconds(20),
        jitter: false,
        retryOn: [ModelFailure.Timeout, ModelFailure.RateLimited, ModelFailure.ServerError],
      }),
      circuitBreakerPolicy: { ...breaker, fallback: BackupModelProvider },
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  let _classSuper = OpenRouterProvider;
  var TestOpenRouterProvider = class extends _classSuper {
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
      TestOpenRouterProvider = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
    requestFields = { provider: { ignore: ["Inceptron"] } };
  };
  return (TestOpenRouterProvider = _classThis);
})();
export { TestOpenRouterProvider };
/** A local server with a price table: OpenAI's dialect, no key. */
let LocalModelProvider = (() => {
  let _classDecorators = [
    ModelProvider({
      name: "local",
      description: "A local OpenAI-compatible server",
      serves: [/^local\//],
      baseUrl: "http://local.test/v1",
      timeout: seconds(10),
      cost: ModelCost.fromPrices({
        "local/llama": {
          inputPerMillion: usd(1),
          outputPerMillion: usd(2),
          cachedInputPerMillion: usd(0.5),
        },
      }),
      reasoning: Reasoning.off(),
      promptCaching: PromptCaching.whereSupported({
        retention: CacheRetention.OneDay,
        cachedParts: [CachedPart.SystemPrompt],
        key: "job-scout",
      }),
      retryPolicy: RetryPolicy.fixed({
        maxAttempts: 2,
        delay: seconds(1),
        retryOn: [ModelFailure.ServerError],
      }),
      circuitBreakerPolicy: breaker,
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  let _classSuper = OpenAiCompatibleProvider;
  var LocalModelProvider = class extends _classSuper {
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
      LocalModelProvider = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
    requestFields = {};
  };
  return (LocalModelProvider = _classThis);
})();
export { LocalModelProvider };
/** A second provider serving `local/*` — two of them make a model ambiguous. */
let LocalMirrorModelProvider = (() => {
  let _classDecorators = [
    ModelProvider({
      name: "local-mirror",
      description: "A mirror of the local server",
      serves: [/^local\//],
      baseUrl: "http://mirror.test/v1",
      timeout: seconds(10),
      cost: ModelCost.fromResponse(),
      reasoning: Reasoning.modelDecides(),
      promptCaching: PromptCaching.off(),
      retryPolicy: RetryPolicy.none(),
      circuitBreakerPolicy: breaker,
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  let _classSuper = OpenAiCompatibleProvider;
  var LocalMirrorModelProvider = class extends _classSuper {
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
      LocalMirrorModelProvider = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
    requestFields = {};
  };
  return (LocalMirrorModelProvider = _classThis);
})();
export { LocalMirrorModelProvider };
