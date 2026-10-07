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
import { Workflow, Agent } from "../../../src/core/index.js";
import { workflowOf } from "../../../src/components/assemble.js";
import { WorkflowStart, WorkflowFinish, from } from "../../../src/graph/index.js";
import { recordNode } from "../../../src/graph/node-kind.js";
import { WorkflowStartText, WorkflowFinishText } from "../../../src/dto/index.js";
import { assembleFlowGraph } from "../../../src/graph/build.js";
import { MemorySaver } from "@langchain/langgraph";
import { WorkflowSettings } from "../../../src/graph/settings.js";
let StartNode = (() => {
    let _classDecorators = [WorkflowStart({ name: "startNode", description: "Start", input: WorkflowStartText })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var StartNode = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            StartNode = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return StartNode = _classThis;
})();
export { StartNode };
let FinishNode = (() => {
    let _classDecorators = [WorkflowFinish({ name: "finishNode", description: "Finish", output: WorkflowFinishText })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var FinishNode = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            FinishNode = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return FinishNode = _classThis;
})();
export { FinishNode };
let BranchAAgent = (() => {
    let _classDecorators = [Agent({ name: "branchA", model: "stub", description: "a", prompt: "" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var BranchAAgent = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            BranchAAgent = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return BranchAAgent = _classThis;
})();
export { BranchAAgent };
let BranchBAgent = (() => {
    let _classDecorators = [Agent({ name: "branchB", model: "stub", description: "b", prompt: "" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var BranchBAgent = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            BranchBAgent = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return BranchBAgent = _classThis;
})();
export { BranchBAgent };
let JoinNodeAgent = (() => {
    let _classDecorators = [Agent({ name: "joinNode", model: "stub", description: "j", prompt: "" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var JoinNodeAgent = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            JoinNodeAgent = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        onJoin(outputs) {
            return {
                contributions: [
                    {
                        content: `Joined: ${String(outputs.branchA?.data)} and ${String(outputs.branchB?.data)}`,
                    },
                ],
                payload: { customJoin: true },
            };
        }
    };
    return JoinNodeAgent = _classThis;
})();
export { JoinNodeAgent };
let ForkJoinWorkflow = (() => {
    let _classDecorators = [Workflow({
            name: "fork-join-test",
            version: "1.0",
            defaults: {
                models: { maxTokens: 100, temperature: 0 },
                history: { limit: 1 },
                tools: { maxToolCalls: 1 },
                router: { kind: "llm", model: "stub" },
            },
            flow: [
                from(StartNode).fanOut(BranchAAgent, BranchBAgent),
                from(BranchAAgent, BranchBAgent).join(JoinNodeAgent),
                from(JoinNodeAgent).next(FinishNode),
            ],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ForkJoinWorkflow = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ForkJoinWorkflow = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        settings() {
            return WorkflowSettings.builder().build();
        }
    };
    return ForkJoinWorkflow = _classThis;
})();
export { ForkJoinWorkflow };
describe("fork-join", () => {
    recordNode(StartNode, { kind: "workflow-start", name: "startNode" });
    recordNode(FinishNode, { kind: "workflow-finish", name: "finishNode" });
    it("compiles and runs correctly", async () => {
        const assembled = await workflowOf(ForkJoinWorkflow);
        expect(assembled.flow).toBeDefined();
        const checkpointer = new MemorySaver();
        const runtime = {
            runnerFor: (node) => async () => {
                const name = node.name;
                await Promise.resolve();
                if (name === "branchA")
                    return { contributions: [{ agent: "branchA", content: "Result A" }] };
                if (name === "branchB")
                    return { contributions: [{ agent: "branchB", content: "Result B" }] };
                if (name === "joinNode")
                    return { contributions: [{ agent: "joinNode", content: "Final Answer" }] };
                return {};
            },
            routerFor: () => ({}),
            routerMemory: { limit: 10, summaries: 0, turns: 10 },
            limits: { perRun: { steps: 50 } },
            spentToday: () => Promise.resolve(0),
            checkpointer,
        };
        const { graph } = await assembleFlowGraph(assembled.flow, runtime);
        const result = await graph.invoke({
            start: "startNode",
            task: "start",
            history: [],
            contributions: [],
            usage: [],
            payload: {},
            forks: {},
        }, { configurable: { thread_id: "1" } });
        expect(result.contributions.length).toBeGreaterThan(0);
        const joinedContrib = result.contributions.find((c) => (typeof c.content === "string" ? c.content : "").startsWith("Joined:"));
        if (!joinedContrib)
            throw new Error("Missing");
        expect(joinedContrib.content).toBe("Joined: Result A and Result B");
        expect(joinedContrib.agent).toBe("joinNode");
        expect(result.payload.customJoin).toBe(true);
    });
});
