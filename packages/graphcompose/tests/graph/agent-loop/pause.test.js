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
import { callTool, replyWith } from "../../../src/testing/index.js";
import { WorkflowPauseQuestion, WorkflowPauseAnswer } from "../../../src/dto/standard/framework.js";
import { WorkflowSettings, chain, WorkflowStart, WorkflowFinish, } from "../../../src/graph/index.js";
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
            ans.replyWith = response;
            return Promise.resolve(ans);
        }
    };
    return AskTool = _classThis;
})();
let Talker = (() => {
    let _classDecorators = [Agent({
            name: "agent",
            description: "talk",
            prompt: "Use ask tool to ask name.",
            tools: [AskTool],
            model: "stub",
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Talker = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Talker = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return Talker = _classThis;
})();
let PauseFlow = (() => {
    let _classDecorators = [Workflow({
            name: "test-pause",
            version: "1.0",
            defaults: {
                models: { maxTokens: 100, temperature: 0 },
                history: { limit: 1 },
                tools: { maxToolCalls: 1 },
                router: { kind: "llm", model: "stub" },
            },
            flow: [chain(Start, Talker, Finish)],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var PauseFlow = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            PauseFlow = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        settings() {
            return WorkflowSettings.builder().build();
        }
    };
    return PauseFlow = _classThis;
})();
function offline(book) {
    return {
        env: {},
        gateway: createScriptedGateway(book),
        stores: { terns: createSqliteTernStore(":memory:"), ledger: createMemoryLedger() },
        pausedRuns: createMemoryPausedRunRepository(),
    };
}
describe("interactive pause", () => {
    it("pauses in the tool and resumes with the replyWith", async () => {
        const book = new ScriptBook();
        book
            .scriptOf("agent:agent")
            .thenReturn(callTool(AskTool, { question: "Name?" }), replyWith("Hello!"));
        const app = await createApp(PauseFlow, offline(book));
        const run1 = await app.execute(Start, { text: "Go" });
        expect(run1.status).toBe("paused");
    });
});
