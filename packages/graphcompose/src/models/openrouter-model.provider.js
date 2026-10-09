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
import { minutes, seconds } from "../units/index.js";
import { ModelCost } from "./cost.js";
import { OPENROUTER_API_KEY, OPENROUTER_BASE_URL_SETTING } from "./jev.provider.js";
import { ModelProvider } from "./model-provider.decorator.js";
import { OpenRouterProvider } from "./openrouter.provider.js";
import { CachedPart, CacheRetention, PromptCaching } from "./prompt-caching.js";
import { Reasoning } from "./reasoning.js";
import { RetryPolicy, TRANSIENT_FAILURES } from "./retry-policy.js";
/**
 * The default chat provider of a workflow that registers none: every model but Jev's on OpenRouter,
 * the cost from its answers, reasoning left to the model, caching where the model supports it.
 */
let OpenRouterModelProvider = (() => {
  let _classDecorators = [
    ModelProvider({
      name: "openrouter",
      description: "OpenRouter — many models behind one OpenAI-compatible API",
      serves: [/^(?!typesafe\/jev-)/],
      baseUrl: OPENROUTER_BASE_URL_SETTING,
      apiKey: OPENROUTER_API_KEY,
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
        jitter: true,
        retryOn: TRANSIENT_FAILURES,
      }),
      circuitBreakerPolicy: { failureThreshold: 5, window: minutes(1), openFor: seconds(30) },
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  let _classSuper = OpenRouterProvider;
  var OpenRouterModelProvider = class extends _classSuper {
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
      OpenRouterModelProvider = _classThis = _classDescriptor.value;
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
  return (OpenRouterModelProvider = _classThis);
})();
export { OpenRouterModelProvider };
