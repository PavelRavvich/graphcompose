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
import { MemorySaver } from "@langchain/langgraph";
import { Agent, Workflow } from "../../../src/core/index.js";
import { workflowOf } from "../../../src/components/assemble.js";
import { assembleFlowGraph } from "../../../src/graph/build.js";
import { from, Router, WorkflowFinish, WorkflowStart, WorkflowSettings, } from "../../../src/graph/index.js";
import { WorkflowFinishText, WorkflowStartText } from "../../../src/dto/index.js";
import { Return } from "../../../src/graph/flow.js";
let SkipStart = (() => {
    let _classDecorators = [WorkflowStart({ name: "skipStart", description: "Start", input: WorkflowStartText })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var SkipStart = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            SkipStart = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return SkipStart = _classThis;
})();
export { SkipStart };
let SkipFinish = (() => {
    let _classDecorators = [WorkflowFinish({ name: "skipFinish", description: "Finish", output: WorkflowFinishText })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var SkipFinish = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            SkipFinish = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return SkipFinish = _classThis;
})();
export { SkipFinish };
let SkipA = (() => {
    let _classDecorators = [Agent({ name: "skipA", model: "stub", description: "a", prompt: "" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var SkipA = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            SkipA = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return SkipA = _classThis;
})();
export { SkipA };
let SkipB = (() => {
    let _classDecorators = [Agent({ name: "skipB", model: "stub", description: "b", prompt: "" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var SkipB = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            SkipB = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return SkipB = _classThis;
})();
export { SkipB };
let SkipAggregator = (() => {
    let _classDecorators = [Agent({ name: "skipAggregator", model: "stub", description: "aggregates", prompt: "" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var SkipAggregator = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            SkipAggregator = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return SkipAggregator = _classThis;
})();
export { SkipAggregator };
let SkipPicker = (() => {
    let _classDecorators = [Router({
            name: "skipPicker",
            description: "Picks a branch",
            prompt: "Which branch?",
            model: "stub",
            routes: [
                { prompt: "branch A", target: SkipA },
                { prompt: "branch B", target: SkipB },
                { prompt: "skip", target: Return },
            ],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var SkipPicker = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            SkipPicker = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return SkipPicker = _classThis;
})();
export { SkipPicker };
let SkipJoinWorkflow = (() => {
    let _classDecorators = [Workflow({
            name: "skip-join-test",
            version: "1.0",
            defaults: {
                models: { maxTokens: 100, temperature: 0 },
                history: { limit: 1 },
                tools: { maxToolCalls: 1 },
                router: { kind: "llm", model: "stub" },
            },
            flow: [
                from(SkipStart).next(SkipPicker),
                from(SkipPicker).routes(SkipA, SkipB, Return),
                from(SkipA, SkipB).join(SkipAggregator),
                from(SkipAggregator).next(SkipFinish),
            ],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var SkipJoinWorkflow = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            SkipJoinWorkflow = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        settings() {
            return WorkflowSettings.builder().build();
        }
    };
    return SkipJoinWorkflow = _classThis;
})();
export { SkipJoinWorkflow };
const picking = (next) => ({
    name: "picker",
    route: () => Promise.resolve({ kind: "decided", decision: { next, reason: "test" } }),
});
it("does not leave the join waiting when explicitly skipping", async () => {
    const { visited, state } = await run("Return");
    expect(visited).toContain("skipAggregator");
});
async function run(chosen) {
    const assembled = await workflowOf(SkipJoinWorkflow);
    const visited = [];
    const runtime = {
        runnerFor: (node) => () => {
            visited.push(node.name ?? "");
            return Promise.resolve(node.name?.startsWith("skip") === true && node.name !== "skipStart"
                ? { contributions: [{ agent: node.name, content: `from ${node.name}` }] }
                : {});
        },
        routerFor: () => picking(chosen),
        routerMemory: { limit: 10, summaries: 0, turns: 10 },
        limits: { perRun: { steps: 50 } },
        spentToday: () => Promise.resolve(0),
        checkpointer: new MemorySaver(),
    };
    const { graph } = await assembleFlowGraph(assembled.flow, runtime);
    const state = await graph.invoke({
        start: "skipStart",
        task: "go",
        history: [],
        contributions: [],
        usage: [],
        payload: {},
        forks: {},
    }, { configurable: { thread_id: `t-${chosen}` } });
    return { state, visited };
}
describe("a router that skips a join source", () => {
    it("does not leave the join waiting: the aggregator runs after the chosen branch", async () => {
        const { visited, state } = await run("skipA");
        expect(visited).toContain("skipA");
        expect(visited).not.toContain("skipB");
        expect(visited).toContain("skipAggregator");
        expect(state.forks.skipB).toMatchObject({ status: "skipped" });
        expect(state.forks.skipA).toMatchObject({ status: "completed" });
    });
    it("works symmetrically when the other branch is chosen", async () => {
        const { visited, state } = await run("skipB");
        expect(visited).toContain("skipB");
        expect(visited).not.toContain("skipA");
        expect(visited).toContain("skipAggregator");
        expect(state.forks.skipA).toMatchObject({ status: "skipped" });
    });
});
