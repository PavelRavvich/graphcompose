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
import { describe, expect, it } from "vitest";
import { chain, from, isNamedNode, labelOf, node, Self } from "../../src/graph/flow.js";
import { collectFlow } from "../../src/graph/flow-nodes.js";
import { testNode } from "./fixtures/nodes.js";
import { AnswerWorkflowFinish, codeReviewFlow, CoderAgent } from "./fixtures/code-review.js";
let A = (() => {
    let _classDecorators = [testNode("agent", "a")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var A = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            A = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return A = _classThis;
})();
let B = (() => {
    let _classDecorators = [testNode("agent", "b")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var B = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            B = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return B = _classThis;
})();
let R = (() => {
    let _classDecorators = [testNode("router", "r")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var R = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            R = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return R = _classThis;
})();
const transitionsOf = (flow) => collectFlow(flow).transitions.map((t) => ({ from: t.from, next: t.next }));
describe("AC1: flow DSL builds the expected transitions", () => {
    it("from(A).next(B) is one unconditional step", () => {
        expect(transitionsOf([from(A).next(B)])).toEqual([
            { from: "a", next: { kind: "to", targets: ["b"] } },
        ]);
    });
    it("from(A, B).next(C) fans in: one step from each source", () => {
        expect(transitionsOf([from(A, B).next(AnswerWorkflowFinish)])).toEqual([
            { from: "a", next: { kind: "to", targets: ["answer"] } },
            { from: "b", next: { kind: "to", targets: ["answer"] } },
        ]);
    });
    it("chain(A, B, C) is from(A).next(B) + from(B).next(C)", () => {
        expect(transitionsOf([chain(A, B, AnswerWorkflowFinish)])).toEqual([
            { from: "a", next: { kind: "to", targets: ["b"] } },
            { from: "b", next: { kind: "to", targets: ["answer"] } },
        ]);
    });
    it("from(Router).routes(...) is one choice with every target; Self is kept as a flag", () => {
        expect(transitionsOf([from(R).routes(A, B, Self)])).toEqual([
            { from: "r", next: { kind: "choose", targets: ["a", "b"], self: true, end: false, return: false, optionNames: ["a", "b"], parallelTargets: [] } },
        ]);
    });
    it("node(Class, name) is a second place for the same class under its own name", () => {
        const SecondA = node(A, "a-again");
        const collected = collectFlow([from(A).next(SecondA)]);
        expect([...collected.nodes.keys()]).toEqual(["a", "a-again"]);
        expect(collected.nodes.get("a-again")).toMatchObject({ kind: "agent", use: A });
        expect(collected.keyOf(SecondA)).toBe("a-again");
    });
    it("the code-review flow has every node once, with its kind", () => {
        const { nodes } = collectFlow(codeReviewFlow);
        expect([...nodes.values()].map((ref) => `${ref.kind}:${ref.name}`)).toEqual([
            "workflow-start:chat",
            "router:main",
            "agent:explainer",
            "agent:coder",
            "workflow-finish:answer",
            "agent:reviewer",
            "router:review-gate",
            "workflow-finish:pull-request",
        ]);
        expect(collectFlow(codeReviewFlow).keyOf(CoderAgent)).toBe("coder");
    });
    it("labels say what a person wrote", () => {
        const named = node(A, "x");
        expect([labelOf(A), labelOf(named), labelOf(Self), isNamedNode(named)]).toEqual([
            "A",
            'node(A, "x")',
            "Self",
            true,
        ]);
    });
});
