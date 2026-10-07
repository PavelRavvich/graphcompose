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
import { createApp, NotAWorkflowStartError } from "../../src/app/create-app.js";
import { Workflow } from "../../src/core/index.js";
import { NotPausedError } from "../../src/index.js";
import { DtoValidationError, Text, WorkflowStartText } from "../../src/dto/index.js";
import { createMemoryLedger } from "../../src/finops/ledger.js";
import { from, GraphRuleError, WorkflowStart, WorkflowSettings, } from "../../src/graph/index.js";
import { createSqliteTernStore } from "../../src/terns/index.js";
import { answer, callTool, decide } from "../../src/testing/index.js";
import { McpStubs, stubbedMcpConnect } from "../../src/testing/mcp-stubs.js";
import { ScriptBook } from "../../src/testing/script-book.js";
import { createScriptedGateway } from "../../src/testing/scripted-gateway.js";
import { usd } from "../../src/units/index.js";
import { ChatStart, Desk, lifecycle, MainRouter, NotesServer, OrderBook, Reply, SaveNote, Support, Writer, } from "../testing/fixtures/desk.workflow.js";
import { CodeReview, Coder, PullRequest, Reviewer, ReviewGate, TaskStart, } from "../testing/fixtures/code-review.workflow.js";
/** Everything external given: scripted models, memory stores, stubbed MCP servers. */
function offline(book, stubs = new McpStubs(book)) {
    return {
        env: {},
        gateway: createScriptedGateway(book),
        stores: { terns: createSqliteTernStore(":memory:"), ledger: createMemoryLedger() },
        connectMcp: stubbedMcpConnect(stubs, new Map(), new Set()),
    };
}
let Ticket = (() => {
    let _classSuper = WorkflowStartText;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    return class Ticket extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _id_decorators = [Text({ prompt: "the ticket id" })];
            __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        id = __runInitializers(this, _id_initializers, void 0);
        constructor() {
            super(...arguments);
            __runInitializers(this, _id_extraInitializers);
        }
    };
})();
let TicketStart = (() => {
    let _classDecorators = [WorkflowStart({ name: "ticket", description: "A helpdesk ticket", input: Ticket })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var TicketStart = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            TicketStart = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return TicketStart = _classThis;
})();
class NoLimits {
    settings() {
        return WorkflowSettings.builder().build();
    }
}
let TwoStarts = (() => {
    let _classDecorators = [Workflow({
            name: "two-starts",
            version: "1.0.0",
            flow: [
                from(TicketStart).next(Support),
                from(ChatStart).next(Writer),
                from(Support, Writer).next(Reply),
            ],
            defaults: {
                models: { temperature: 0, thinking: "default", cache: true },
                router: { kind: "jev", model: "typesafe/jev-1.13" },
                tools: { maxToolCalls: 2 },
                history: { limit: 2 },
            },
            mcp: [NotesServer],
            providers: [OrderBook],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = NoLimits;
    var TwoStarts = class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            TwoStarts = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return TwoStarts = _classThis;
})();
let Broken = (() => {
    let _classDecorators = [Workflow({
            name: "broken",
            version: "1.0.0",
            flow: [from(ChatStart).next(Writer), from(Support).next(Reply)],
            defaults: {
                models: { temperature: 0, thinking: "default", cache: true },
                router: { kind: "jev", model: "typesafe/jev-1.13" },
                tools: { maxToolCalls: 2 },
                history: { limit: 2 },
            },
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = NoLimits;
    var Broken = class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Broken = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return Broken = _classThis;
})();
describe("AC12: createApp — the real app", () => {
    it("assembles before any model call and reports every assembly error at once", async () => {
        const book = new ScriptBook();
        const built = createApp(Broken, offline(book));
        await expect(built).rejects.toBeInstanceOf(GraphRuleError);
        const codes = await built.catch((error) => error instanceof GraphRuleError ? error.violations.map((item) => item.code) : []);
        expect(codes).toEqual(expect.arrayContaining(["graph.dead-end", "graph.unreachable-node"]));
    });
    it("run returns thread, finish, output, path and spend", async () => {
        const book = new ScriptBook();
        book.scriptOf("agent:coder").respond(answer("v1", { cost: usd(0.002) }));
        book.scriptOf("agent:reviewer").respond(answer("clean"));
        book.scriptOf("router:review-gate").respond(decide(PullRequest));
        const app = await createApp(CodeReview, offline(book));
        const result = await app.execute(TaskStart, { text: "Add a flag" });
        await app.close();
        expect(result).toMatchObject({
            finish: "pull-request",
            output: { text: "clean" },
            path: [TaskStart, Coder, Reviewer, ReviewGate, PullRequest],
            status: "answered",
        });
        expect(result.thread).toMatch(/^[0-9a-f-]{36}$/);
        expect(result.spend.totalUsd).toBeCloseTo(0.002, 9);
        expect(app.textStart).toBe(TaskStart);
        expect([app.name, app.version, app.warnings]).toEqual(["code-review", "1.0.0", []]);
    });
    it("resume continues the paused run of a thread; a thread without a pause cannot resume", async () => {
        const book = new ScriptBook();
        const stubs = new McpStubs(book);
        stubs.stubOf("notes").respond({ write_file: () => Promise.resolve({ content: "ok" }) });
        book.scriptOf("router:main").respond(decide(Support));
        book
            .scriptOf("agent:support")
            .respond(callTool(SaveNote, { title: "a", text: "b" }), answer("Saved."));
        const app = await createApp(Desk, offline(book, stubs));
        const paused = await app.execute(ChatStart, { text: "save a note" });
        const done = await app.resume(paused.thread, { approved: true, by: "dana" });
        expect(paused).toMatchObject({
            status: "paused",
            pause: { agent: "support", tool: "save_note" },
        });
        expect(paused.path).toEqual([ChatStart, MainRouter, Support]);
        expect(done).toMatchObject({
            finish: "reply",
            output: { text: "Saved." },
            thread: paused.thread,
        });
        await expect(app.resume(paused.thread, { approved: true, by: "dana" })).rejects.toBeInstanceOf(NotPausedError);
        await app.close();
    });
    it("close runs onStop of the components it started, once", async () => {
        lifecycle.length = 0;
        const app = await createApp(Desk, offline(new ScriptBook()));
        const started = [...lifecycle];
        await app.close();
        await app.close();
        expect(started).toEqual(["OrderBook.onStart"]);
        expect(lifecycle).toEqual(["OrderBook.onStart", "OrderBook.onStop"]);
    });
    it("checks the start and its input DTO before any call", async () => {
        const book = new ScriptBook();
        const app = await createApp(CodeReview, offline(book));
        await expect(app.execute(ChatStart, { text: "hi" })).rejects.toBeInstanceOf(NotAWorkflowStartError);
        await expect(app.execute(Reply, { text: "hi" })).rejects.toThrow('Reply is not a workflow start of "code-review"');
        await expect(app.execute(TaskStart, { text: "" })).rejects.toBeInstanceOf(DtoValidationError);
        expect(book.scriptOf("agent:coder").requests).toEqual([]);
        await app.close();
    });
    it("with several workflow starts, the run starts at the one asked for", async () => {
        const book = new ScriptBook();
        book.scriptOf("agent:support").respond(answer("ticket"));
        book.scriptOf("agent:writer").respond(answer("chat"));
        const app = await createApp(TwoStarts, offline(book));
        const ticket = await app.execute(TicketStart, { text: "printer broken", id: "T-1" });
        const chat = await app.execute(ChatStart, { text: "hi" });
        await app.close();
        expect(ticket).toMatchObject({
            output: { text: "ticket" },
            path: [TicketStart, Support, Reply],
        });
        expect(chat).toMatchObject({ output: { text: "chat" }, path: [ChatStart, Writer, Reply] });
        expect(app.textStart).toBe(ChatStart);
    });
});
