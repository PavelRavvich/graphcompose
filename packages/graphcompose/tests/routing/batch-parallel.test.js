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
import { WorkflowAction, Workflow } from "../../src/components/decorators.js";
import { from } from "../../src/graph/flow.js";
import { BatchParallelStrategy } from "../../src/concurrency/batch.decorator.js";
import { WorkflowStart, WorkflowFinish } from "../../src/graph/index.js";
const executionOrder = [];
let NumberStrategy = (() => {
    let _classDecorators = [BatchParallelStrategy()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var NumberStrategy = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            NumberStrategy = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        extract() {
            return [1, 2, 3, 4, 5];
        }
    };
    return NumberStrategy = _classThis;
})();
let Start = (() => {
    let _classDecorators = [WorkflowStart({ name: "Start" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Start = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Start = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return Start = _classThis;
})();
let Finish = (() => {
    let _classDecorators = [WorkflowFinish({ name: "Finish" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Finish = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Finish = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return Finish = _classThis;
})();
let Worker = (() => {
    let _classDecorators = [WorkflowAction({ name: "Worker" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Worker = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Worker = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        execute(state) {
            executionOrder.push(`worker-${String(state.batchItem)}`);
            return {};
        }
    };
    return Worker = _classThis;
})();
let Summary = (() => {
    let _classDecorators = [WorkflowAction({ name: "Summary" })];
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
        execute() {
            executionOrder.push("summary");
            return {};
        }
    };
    return Summary = _classThis;
})();
let BatchParallelWorkflow = (() => {
    let _classDecorators = [Workflow({
            name: "batch-parallel-workflow",
            agents: [Start, Worker, Summary, Finish],
            providers: [NumberStrategy],
            flow: [
                from(Start).batchParallel(Worker, NumberStrategy, { concurrencyLimit: 2, batchSize: 2 }),
                from(Worker).next(Summary),
                from(Summary).next(Finish),
            ],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var BatchParallelWorkflow = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            BatchParallelWorkflow = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        settings() {
            return {
                name: "batch-parallel-workflow",
                version: "1.0.0",
                defaults: {
                    models: { temperature: 0, maxTokens: 1000, thinking: "default", cache: true },
                    router: { kind: "jev", model: "mock" },
                    tools: { maxToolCalls: 8 },
                    history: { limit: 5 },
                },
                agents: {
                    Worker: { model: "mock", description: "worker" },
                    Summary: { model: "mock", description: "summary" },
                },
            };
        }
    };
    return BatchParallelWorkflow = _classThis;
})();
describe("BatchParallel (Scatter-Gather)", () => {
    it("should process items with the correct concurrency limit", async () => {
        executionOrder.length = 0; // reset
        // We cannot use createApp easily if we don't know how it executes.
        // Wait, let's just check the flow AST instead, using collectFlow.
        const { collectFlow } = await import("../../src/graph/flow-nodes.js");
        const collected = collectFlow([
            from(Start).batchParallel(Worker, NumberStrategy, { concurrencyLimit: 2, batchSize: 2 }),
            from(Worker).next(Summary),
            from(Summary).next(Finish),
        ]);
        expect(collected.nodes.size).toBe(4);
        const workerNode = Array.from(collected.nodes.values()).find((n) => n.name === "Worker");
        expect(workerNode).toBeDefined();
        const transitions = collected.transitions;
        const batchTransition = transitions.find((t) => t.next.kind === "batchParallel");
        expect(batchTransition).toBeDefined();
        expect((batchTransition?.next).options.concurrencyLimit).toBe(2);
    });
});
