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
import { compareNames } from "../llm/canonical-order.js";
import { createJevClient } from "../llm/jev-client.js";
import { minutes, seconds } from "../units/index.js";
import { ModelCost } from "./cost.js";
import { EnvironmentVariable } from "./environment-variable.js";
import { ModelProvider } from "./model-provider.decorator.js";
import { PromptCaching } from "./prompt-caching.js";
import { Reasoning } from "./reasoning.js";
import { RetryPolicy, TRANSIENT_FAILURES } from "./retry-policy.js";
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
/** OpenRouter's base URL, `OPENROUTER_BASE_URL` overriding it (a proxy, a local stub). */
export const OPENROUTER_BASE_URL_SETTING = EnvironmentVariable.named("OPENROUTER_BASE_URL", {
  secret: false,
  defaultValue: OPENROUTER_BASE_URL,
});
export const OPENROUTER_API_KEY = EnvironmentVariable.named("OPENROUTER_API_KEY", { secret: true });
/** Jev models the Decisions API serves; a subclass lists more (`override readonly knownModels`). */
export const JEV_MODELS = ["typesafe/jev-1.13", "typesafe/jev-router"];
/**
 * Jev on OpenRouter's Decisions API: calibrated probabilities over fixed options, the exact cost in
 * every replyWith. Serves `typesafe/jev-*` for routers, guards and judges — decisions only, no chat.
 */
let JevModelProvider = (() => {
  let _classDecorators = [
    ModelProvider({
      name: "jev",
      description: "Jev decisions on OpenRouter's Decisions API",
      serves: [/^typesafe\/jev-/],
      baseUrl: OPENROUTER_BASE_URL_SETTING,
      apiKey: OPENROUTER_API_KEY,
      timeout: seconds(30),
      cost: ModelCost.fromResponse(),
      reasoning: Reasoning.modelDecides(),
      promptCaching: PromptCaching.off(),
      retryPolicy: RetryPolicy.exponential({
        maxAttempts: 3,
        initialDelay: seconds(1),
        maxDelay: seconds(10),
        jitter: true,
        retryOn: TRANSIENT_FAILURES,
      }),
      circuitBreakerPolicy: { failureThreshold: 5, window: minutes(1), openFor: seconds(30) },
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var JevModelProvider = class {
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
      JevModelProvider = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
    knownModels = JEV_MODELS;
    /** Options sorted by name: declaration order changes neither the request nor its fingerprint. */
    routeTo({ decision, connection }) {
      const questions = Object.fromEntries(
        Object.entries(decision.questions).map(([id, question]) => [
          id,
          {
            ...question,
            criteria: Object.fromEntries(
              Object.entries(question.criteria).sort(([a], [b]) => compareNames(a, b)),
            ),
          },
        ]),
      );
      const client = createJevClient(
        { apiKey: connection.apiKey ?? "", baseUrl: connection.baseUrl },
        connection.fetch,
      );
      return client({ ...decision, questions });
    }
    capabilities(model) {
      return Promise.resolve(this.knownModels.includes(model) ? { model } : undefined);
    }
  };
  return (JevModelProvider = _classThis);
})();
export { JevModelProvider };
