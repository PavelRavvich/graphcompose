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
import { WorkflowStartText, Text, WorkflowFinishText } from "../../src/dto/index.js";
import { workflowFinishMetaOf } from "../../src/graph/workflow-finish.decorator.js";
import { WorkflowStart, workflowStartMetaOf } from "../../src/graph/workflow-start.decorator.js";
import { from } from "../../src/graph/flow.js";
import { nodeInfoOf } from "../../src/graph/node-kind.js";
import { runAgent } from "../../src/index.js";
import { Alpha, Beta, TestAnswer, TestChat } from "../fixtures/test-flow/test.flow.js";
import { fakeDeps } from "../helpers.js";
/** A second workflow start: a ticket from a helpdesk webhook (still a chat message for now). */
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
let TicketWorkflowStart = (() => {
    let _classDecorators = [WorkflowStart({ name: "ticket", description: "A helpdesk ticket", input: Ticket })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var TicketWorkflowStart = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            TicketWorkflowStart = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return TicketWorkflowStart = _classThis;
})();
/** Each workflow start leads to its own agent. */
const twoStarts = [
    from(TestChat).next(Alpha),
    from(TicketWorkflowStart).next(Beta),
    from(Alpha, Beta).next(TestAnswer),
];
describe("AC1: minimal @WorkflowStart and @WorkflowFinish", () => {
    it("mark classes as workflow start and workflow finish nodes, with their options", () => {
        expect(nodeInfoOf(TestChat)).toEqual({ kind: "workflow-start", name: "chat" });
        expect(nodeInfoOf(TestAnswer)).toEqual({ kind: "workflow-finish", name: "replyWith" });
        expect(workflowStartMetaOf(TestChat)?.input).toBe(WorkflowStartText);
        expect(workflowFinishMetaOf(TestAnswer)?.output).toBe(WorkflowFinishText);
    });
    it("with several workflow starts, the run starts at the one asked for; a plain task goes to the chat workflow start", async () => {
        const deps = {
            ...fakeDeps({ "test/alpha": ["chat"], "test/beta": ["ticket"] }),
            flow: twoStarts,
        };
        const ticket = await runAgent({ task: "printer broken", start: "ticket" }, deps);
        const chat = await runAgent({ task: "hi" }, deps);
        expect(ticket).toMatchObject({ replyWith: "ticket", route: ["beta"], finish: "replyWith" });
        expect(chat).toMatchObject({ replyWith: "chat", route: ["alpha"], finish: "replyWith" });
    });
});
