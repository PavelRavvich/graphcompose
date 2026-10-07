var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
import { Agent, Workflow } from "../../src/core/index.js";
import { Rag } from "../../src/rag/index.js";
import { testConfig } from "../helpers.js";
import { starOf, TestSettings } from "../fixtures/test-flow/star.js";
/** A connector with fixed results — any class implementing the contract is a knowledge base. */
let Handbook = (() => {
    let _classDecorators = [Rag({ name: "handbook", description: "The team handbook", topK: 2 })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Handbook = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Handbook = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        queries = [];
        retrieve(query, options) {
            this.queries.push(query);
            const results = [
                { source: "oncall.md", text: "On-call starts after the third month." },
                { source: "leave.md", text: "Leave is 25 days a year." },
                { source: "tools.md", text: "Use the #help channel." },
            ];
            return Promise.resolve({ results: results.slice(0, options.topK), costUsd: 0.0002 });
        }
    };
    return Handbook = _classThis;
})();
export { Handbook };
/** Another implementation of the same knowledge base — swapping needs no change elsewhere. */
let HandbookFromApi = (() => {
    let _classDecorators = [Rag({ name: "handbook", description: "The team handbook", topK: 2 })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var HandbookFromApi = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            HandbookFromApi = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        retrieve() {
            return Promise.resolve({
                results: [{ source: "api:handbook/42", text: "On-call: month 3." }],
            });
        }
    };
    return HandbookFromApi = _classThis;
})();
export { HandbookFromApi };
const prompt = "../components/fixture/greeter.prompt.md";
const base = {
    version: "1.0.0",
    defaults: testConfig.defaults,
};
export function bundleWith(use, mode) {
    let Helper = (() => {
        let _classDecorators = [Agent({
                name: "helper",
                description: "Helps",
                model: "test/alpha",
                price: testConfig.agents.alpha.price,
                rag: [{ use, mode }],
                prompt: prompt,
                promptVars: { language: "English" },
            })];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis;
        var Helper = class {
            static { _classThis = this; }
            static {
                const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
                __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
                Helper = _classThis = _classDescriptor.value;
                if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
                __runInitializers(_classThis, _classExtraInitializers);
            }
        };
        return Helper = _classThis;
    })();
    let HandbookBundle = (() => {
        let _classDecorators = [Workflow({ ...base, name: "handbook-bundle", flow: starOf(Helper) })];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis;
        let _classSuper = TestSettings;
        var HandbookBundle = class extends _classSuper {
            static { _classThis = this; }
            static {
                const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
                __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
                HandbookBundle = _classThis = _classDescriptor.value;
                if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
                __runInitializers(_classThis, _classExtraInitializers);
            }
        };
        return HandbookBundle = _classThis;
    })();
    return HandbookBundle;
}
