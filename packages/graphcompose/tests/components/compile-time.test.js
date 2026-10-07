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
/**
 * AC3 (#87): these mistakes are compile errors. `make check` runs `tsc`; an `@ts-expect-error` whose
 * line compiles would itself fail the build — so every line below must stay an error.
 */
import { describe, expect, it } from "vitest";
import { Agent, InjectionToken } from "../../src/core/index.js";
import { Tool } from "../../src/tool/index.js";
import { Text } from "../../src/dto/index.js";
import { testConfig } from "../helpers.js";
class Judge {
    judge = true;
}
const SEARCH = new InjectionToken("SEARCH");
let Query = (() => {
    let _q_decorators;
    let _q_initializers = [];
    let _q_extraInitializers = [];
    return class Query {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _q_decorators = [Text()];
            __esDecorate(null, null, _q_decorators, { kind: "field", name: "q", static: false, private: false, access: { has: obj => "q" in obj, get: obj => obj.q, set: (obj, value) => { obj.q = value; } }, metadata: _metadata }, _q_initializers, _q_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        q = __runInitializers(this, _q_initializers, void 0);
        constructor() {
            __runInitializers(this, _q_extraInitializers);
        }
    };
})();
let Answer = (() => {
    let _text_decorators;
    let _text_initializers = [];
    let _text_extraInitializers = [];
    return class Answer {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _text_decorators = [Text()];
            __esDecorate(null, null, _text_decorators, { kind: "field", name: "text", static: false, private: false, access: { has: obj => "text" in obj, get: obj => obj.text, set: (obj, value) => { obj.text = value; } }, metadata: _metadata }, _text_initializers, _text_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        text = __runInitializers(this, _text_initializers, void 0);
        constructor() {
            __runInitializers(this, _text_extraInitializers);
        }
    };
})();
const In = Query;
const Out = Answer;
let Ok = (() => {
    let _classDecorators = [Tool({ name: "ok", description: "d", input: In, output: Out, deps: [Judge, SEARCH] })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Ok = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Ok = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        judge;
        search;
        constructor(judge, search) {
            this.judge = judge;
            this.search = search;
        }
        run() {
            return Promise.resolve({ text: "" });
        }
    };
    return Ok = _classThis;
})();
// @ts-expect-error — deps in the wrong order
let Swapped = (() => {
    let _classDecorators = [Tool({ name: "swapped", description: "d", input: In, output: Out, deps: [SEARCH, Judge] })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Swapped = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Swapped = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        judge;
        search;
        constructor(judge, search) {
            this.judge = judge;
            this.search = search;
        }
        run() {
            return Promise.resolve({ text: "" });
        }
    };
    return Swapped = _classThis;
})();
// @ts-expect-error — a dependency missing from deps
let Missing = (() => {
    let _classDecorators = [Tool({ name: "missing", description: "d", input: In, output: Out, deps: [Judge] })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Missing = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Missing = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        judge;
        search;
        constructor(judge, search) {
            this.judge = judge;
            this.search = search;
        }
        run() {
            return Promise.resolve({ text: "" });
        }
    };
    return Missing = _classThis;
})();
// @ts-expect-error — run returns what the output DTO does not allow
let WrongOutput = (() => {
    let _classDecorators = [Tool({ name: "wrong-output", description: "d", input: In, output: Out })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var WrongOutput = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            WrongOutput = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        run() {
            return Promise.resolve(1);
        }
    };
    return WrongOutput = _classThis;
})();
/** Type-checked, never run: at runtime the missing name would be a ReferenceError. */
function usesMissing() {
    let UsesMissing = (() => {
        let _classDecorators = [Agent({
                name: "a",
                description: "d",
                model: "m",
                price: testConfig.agents.alpha.price,
                // @ts-expect-error — a component that is not imported / does not exist
                tools: [NotImported],
                prompt: "./x.md",
            })];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis;
        var UsesMissing = class {
            static { _classThis = this; }
            static {
                const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
                __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
                UsesMissing = _classThis = _classDescriptor.value;
                if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
                __runInitializers(_classThis, _classExtraInitializers);
            }
        };
        return UsesMissing = _classThis;
    })();
    return UsesMissing;
}
/** Type-checked, never run: the server's tools and their arguments are checked by the compiler (#109). */
function wrongServerCall(files) {
    // @ts-expect-error — the server declares no tool "write"
    void files.call("write", { path: "x" });
    // @ts-expect-error — "read" takes a FileRead: { path }
    return files.call("read", { file: "x" });
}
describe("components — compile-time checks", () => {
    it("AC3: the file above type-checks only because each mistake is a compile error", () => {
        expect([Ok, Swapped, Missing, WrongOutput, usesMissing, wrongServerCall]).toHaveLength(6);
    });
});
