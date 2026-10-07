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
import { createApp } from "../../../src/app/create-app.js";
import { Agent, Workflow, Tool } from "../../../src/components/decorators.js";
import { ScriptBook } from "../../../src/testing/script-book.js";
import { createScriptedGateway } from "../../../src/testing/scripted-gateway.js";
import { createMemoryLedger } from "../../../src/finops/ledger.js";
import { createSqliteTernStore } from "../../../src/terns/index.js";
import { callTool, answer } from "../../../src/testing/index.js";
import { WorkflowPauseQuestion, WorkflowPauseAnswer } from "../../../src/dto/standard/framework.js";
import { WorkflowSettings, from, parallel, optional, WorkflowStart, WorkflowFinish, Router, } from "../../../src/graph/index.js";
import { WorkflowStartText, WorkflowFinishText } from "../../../src/dto/index.js";
import { createMemoryPausedRunRepository } from "../../../src/app/paused-runs.js";
let Start = (() => {
    let _classDecorators = [WorkflowStart({ name: "start", description: "Start", input: WorkflowStartText })];
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
    let _classDecorators = [WorkflowFinish({ name: "finish", description: "Finish", output: WorkflowFinishText })];
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
let AskTool = (() => {
    let _classDecorators = [Tool({
            name: "ask",
            description: "ask user",
            input: WorkflowPauseQuestion,
            output: WorkflowPauseAnswer,
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AskTool = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AskTool = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        run(input, ctx) {
            const response = ctx.pause(input);
            const ans = new WorkflowPauseAnswer();
            ans.answer = response;
            return Promise.resolve(ans);
        }
    };
    return AskTool = _classThis;
})();
let AgentA = (() => {
    let _classDecorators = [Agent({ name: "agentA", description: "fast agent", prompt: "Just answer.", model: "stub" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AgentA = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AgentA = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return AgentA = _classThis;
})();
let AgentB = (() => {
    let _classDecorators = [Agent({
            name: "agentB",
            description: "slow agent",
            prompt: "Use ask tool.",
            tools: [AskTool],
            model: "stub",
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AgentB = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AgentB = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return AgentB = _classThis;
})();
let TestRouter = (() => {
    let _classDecorators = [Router({
            name: "router",
            description: "router",
            prompt: "choose",
            routes: [{ prompt: "do both", target: parallel(AgentA, optional(AgentB)) }],
            model: "stub",
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var TestRouter = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            TestRouter = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return TestRouter = _classThis;
})();
let ParallelFlow = (() => {
    let _classDecorators = [Workflow({
            name: "test-parallel",
            version: "1.0",
            defaults: {
                models: { maxTokens: 100, temperature: 0 },
                history: { limit: 1 },
                tools: { maxToolCalls: 1 },
                router: { kind: "llm", model: "stub" },
            },
            flow: [
                from(Start).next(TestRouter),
                from(TestRouter).routes(parallel(AgentA, optional(AgentB))),
                from(AgentA, AgentB).join(Finish),
            ],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ParallelFlow = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ParallelFlow = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        settings() {
            return WorkflowSettings.builder().build();
        }
    };
    return ParallelFlow = _classThis;
})();
function offline(book) {
    return {
        env: {},
        gateway: createScriptedGateway(book),
        stores: { terns: createSqliteTernStore(":memory:"), ledger: createMemoryLedger() },
        pausedRuns: createMemoryPausedRunRepository(),
    };
}
describe("Ticket 174: Parallel routing with Human-in-the-loop pauses", () => {
    it("should run parallel branches, one hitting a pause, and merge them on resume", async () => {
        const book = new ScriptBook();
        book.scriptOf("router:router").respond(answer("parallel(agentA, optional(agentB))"));
        book.scriptOf("agent:agentA").respond(answer("done A"));
        book
            .scriptOf("agent:agentB")
            .respond(callTool(AskTool, { question: "Wait!" }), answer("done B"));
        const app = await createApp(ParallelFlow, offline(book));
        const input = new WorkflowStartText();
        input.text = "go";
        const run = await app.execute(Start, { text: "go" });
        expect(run.status).toBe("paused");
        const pause = run.pause;
        expect(pause.agent).toBe("agentB");
        const resumed = await app.resume(run.thread, "ok");
        expect(resumed.status).toBe("answered");
    });
    it("should swallow errors from optional agents and merge successful branches", async () => {
        const book = new ScriptBook();
        book;
        book.scriptOf("router:router").respond(answer("parallel(AgentA, optional(AgentB))"));
        book.scriptOf("agent:agentA").respond(answer("done A"));
        book.scriptOf("agent:agentB").respond(new Error("Network failed"));
        const app = await createApp(ParallelFlow, offline(book));
        const run = await app.execute(Start, { text: "go" });
        // The run should finish successfully, as AgentB error was swallowed
        expect(run.status).toBe("answered");
    });
});
