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
import { Agent, Injectable, Tool, Workflow, } from "../../src/core/index.js";
import { Router, WorkflowStart, from } from "../../src/graph/index.js";
import { WorkflowFinish } from "../../src/graph/workflow-finish.decorator.js";
import { Rag } from "../../src/components/decorators.js";
import { WorkflowStartText, WorkflowFinishText, Text } from "../../src/dto/index.js";
import { buildApp } from "../../src/app/create-app.js";
import { workflowOf } from "../../src/components/assemble.js";
import { createScriptedGateway } from "../../src/testing/scripted-gateway.js";
import { ScriptBook } from "../../src/testing/script-book.js";
import { replyWith, callTool, routeTo } from "../../src/testing/index.js";
import { testConfig } from "../helpers.js";
import { TestSettings } from "../fixtures/test-flow/star.js";
let ToolInput = (() => {
    let _text_decorators;
    let _text_initializers = [];
    let _text_extraInitializers = [];
    return class ToolInput {
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
const hookEvents = [];
let capturedState = null;
let GlobalObserver = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var GlobalObserver = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            GlobalObserver = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async onWorkflowStart(state) {
            hookEvents.push("WorkflowStart");
            capturedState = state;
        }
        async onWorkflowEnd(res, state) {
            hookEvents.push("WorkflowEnd");
        }
        async onAgentStart(ctx) {
            hookEvents.push(`AgentStart:${ctx.name}`);
        }
        async onAgentEnd(ctx) {
            hookEvents.push(`AgentEnd:${ctx.name}`);
        }
        async onRouterStart(ctx) {
            hookEvents.push(`RouterStart:${ctx.name}`);
        }
        async onRouterEnd(ctx) {
            hookEvents.push(`RouterEnd:${ctx.name}`);
        }
        async onToolStart(ctx) {
            hookEvents.push(`ToolStart:${ctx.toolName}`);
        }
        async onToolEnd(ctx) {
            hookEvents.push(`ToolEnd:${ctx.toolName}`);
        }
        async onModelStart(req) {
            hookEvents.push(`ModelStart:${req.callerName}`);
        }
        async onModelEnd(res) {
            hookEvents.push(`ModelEnd:${res.callerName}`);
        }
        async onRagStart(ctx) {
            hookEvents.push(`RagStart:${ctx.name}`);
        }
        async onRagEnd(ctx) {
            hookEvents.push(`RagEnd:${ctx.name}`);
        }
        async onError(err, state) {
            hookEvents.push("Error");
        }
    };
    return GlobalObserver = _classThis;
})();
let ObsTool = (() => {
    let _classDecorators = [Tool({
            name: "ObsTool",
            description: "Does things",
            input: ToolInput,
            output: ToolInput,
            deps: [GlobalObserver],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ObsTool = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ObsTool = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        obs;
        constructor(obs) {
            this.obs = obs;
        }
        async run(input) {
            return { text: "done" };
        }
    };
    return ObsTool = _classThis;
})();
let ObsStart = (() => {
    let _classDecorators = [WorkflowStart({ name: "Start", description: "Start", input: WorkflowStartText })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ObsStart = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ObsStart = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        obs;
        constructor(obs) {
            this.obs = obs;
        }
    };
    return ObsStart = _classThis;
})();
let ObsFinish = (() => {
    let _classDecorators = [WorkflowFinish({ name: "ObsFinish", description: "Finish", output: WorkflowFinishText })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ObsFinish = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ObsFinish = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return ObsFinish = _classThis;
})();
let ObsRag = (() => {
    let _classDecorators = [Rag({ name: "ObsRag", description: "test rag", topK: 5 })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ObsRag = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ObsRag = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async retrieve() {
            return { results: [] };
        }
    };
    return ObsRag = _classThis;
})();
let ObsAgent = (() => {
    let _classDecorators = [Agent({
            name: "ObsAgent",
            description: "test agent",
            model: "test",
            tools: [ObsTool],
            rag: [{ use: ObsRag, mode: "context" }],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ObsAgent = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ObsAgent = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return ObsAgent = _classThis;
})();
let ObsRouter = (() => {
    let _classDecorators = [Router({
            description: "Router",
            model: "stub",
            name: "ObsRouter",
            prompt: "Decide.",
            maxVisits: 10,
            routes: [
                { prompt: "go", target: ObsAgent },
                { prompt: "stop", target: ObsFinish },
            ],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ObsRouter = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ObsRouter = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return ObsRouter = _classThis;
})();
let ObsWorkflow = (() => {
    let _classDecorators = [Workflow({
            name: "obs-test",
            version: "1.0.0",
            defaults: testConfig.defaults,
            providers: [GlobalObserver],
            flow: [
                from(ObsStart).next(ObsRouter),
                from(ObsRouter).routes(ObsAgent, ObsFinish),
                from(ObsAgent).next(ObsRouter),
            ],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = TestSettings;
    var ObsWorkflow = class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ObsWorkflow = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return ObsWorkflow = _classThis;
})();
describe("Global Observability Hooks", () => {
    it("fires hooks in correct order and provides AppState", async () => {
        hookEvents.length = 0; // reset
        capturedState = null;
        const book = new ScriptBook();
        book.scriptOf("router:ObsRouter").thenReturn(routeTo(ObsAgent), routeTo(ObsFinish));
        book
            .scriptOf("agent:ObsAgent")
            .thenReturn(callTool(ObsTool, { text: "hello" }), replyWith("Hello user!"));
        const { app, deps } = await buildApp(await workflowOf(ObsWorkflow), {
            gateway: createScriptedGateway(book),
        });
        // Eagerly instantiate ObsTool to ensure GlobalObserver is in lifecycle.created
        deps.tools("ObsTool");
        book.scriptOf("router:ObsRouter").thenReturn(routeTo(ObsAgent), routeTo(ObsFinish));
        book
            .scriptOf("agent:ObsAgent")
            .thenReturn(callTool(ObsTool, { text: "hello" }), replyWith("Hello user!"));
        await app.execute(ObsStart, { text: "Hi" });
        // Ensure all hook types fired
        expect(hookEvents).toContain("WorkflowStart");
        expect(hookEvents).toContain("WorkflowEnd");
        expect(hookEvents).toContain("RouterStart:ObsRouter");
        expect(hookEvents).toContain("RouterEnd:ObsRouter");
        expect(hookEvents).toContain("AgentStart:ObsAgent");
        expect(hookEvents).toContain("AgentEnd:ObsAgent");
        expect(hookEvents).toContain("ToolStart:ObsTool");
        expect(hookEvents).toContain("ToolEnd:ObsTool");
        expect(hookEvents).toContain("ModelStart:ObsAgent");
        expect(hookEvents).toContain("ModelEnd:ObsAgent");
        expect(hookEvents).toContain("RagStart:ObsRag");
        expect(hookEvents).toContain("RagEnd:ObsRag");
        expect(capturedState).not.toBeNull();
        expect(capturedState?.runId).toBeDefined();
        await app.close();
    });
});
