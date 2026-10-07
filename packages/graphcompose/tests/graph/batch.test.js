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
import { from } from "../../src/graph/flow.js";
import { Agent } from "../../src/components/decorators.js";
import { FlowApp } from "../../src/app/index.js";
let BatchWorker = (() => {
    let _classDecorators = [Agent({ name: "BatchWorker" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var BatchWorker = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            BatchWorker = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async prompt(state) {
            return `Processed ${state.batchItem}`;
        }
    };
    return BatchWorker = _classThis;
})();
let Summary = (() => {
    let _classDecorators = [Agent({ name: "Summary" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Summary = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Summary = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async prompt(state) {
            return "All done";
        }
    };
    return Summary = _classThis;
})();
const flow = [
    from("start").batchParallel(BatchWorker, (s) => s.payload.items, { concurrency: 2 }),
    from(BatchWorker).join(Summary),
    from(Summary).end(),
];
describe("batchParallel", () => {
    it("processes items in batches", async () => {
        const app = new FlowApp({ flow, components: [BatchWorker, Summary] });
        const result = await app.invoke({
            task: "test",
            payload: { items: ["a", "b", "c"] }
        });
        // We expect 3 contributions from BatchWorker
        const workerContribs = result.contributions.filter(c => c.agent === "BatchWorker");
        expect(workerContribs).toHaveLength(3);
        // They should have processed a, b, c
        const contents = workerContribs.map(c => c.content).sort();
        expect(contents).toEqual(["Processed a", "Processed b", "Processed c"]);
        // Summary should have run once
        const summaryContribs = result.contributions.filter(c => c.agent === "Summary");
        expect(summaryContribs).toHaveLength(1);
        expect(summaryContribs[0].content).toEqual("All done");
    });
});
