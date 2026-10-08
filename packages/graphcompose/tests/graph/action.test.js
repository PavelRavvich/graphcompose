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
import { describe, expect, it, vi, beforeEach } from "vitest";
import { WorkflowAction, Agent, } from "../../src/components/decorators.js";
import { from } from "../../src/graph/flow.js";
import { runAgent } from "../../src/index.js";
import { TestAnswer, TestChat } from "../fixtures/test-flow/test.flow.js";
import { fakeDeps } from "../helpers.js";
// --- Fixtures ---
let AlphaAgent = (() => {
    let _classDecorators = [Agent({ name: "alpha", description: "Does something before action", model: "stub" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AlphaAgent = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AlphaAgent = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return AlphaAgent = _classThis;
})();
let BetaAgent = (() => {
    let _classDecorators = [Agent({ name: "beta", description: "Does something after action", model: "stub" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var BetaAgent = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            BetaAgent = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return BetaAgent = _classThis;
})();
// Spies for actions
const syncActionSpy = vi.fn();
const parallelActionSpy = vi.fn();
let SyncDbAction = (() => {
    let _classDecorators = [WorkflowAction({ name: "sync-db", description: "Sync data to database" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var SyncDbAction = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            SyncDbAction = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async execute(state, context) {
            syncActionSpy(state.payload?.data);
            return { payload: { ...state.payload, data: (state.payload?.data || "") + " (synced)" } };
        }
    };
    return SyncDbAction = _classThis;
})();
let NotifyAction = (() => {
    let _classDecorators = [WorkflowAction({ name: "notify-analytics", description: "Send metrics" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var NotifyAction = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            NotifyAction = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async execute(state, context) {
            parallelActionSpy(state.payload?.asyncCount);
            return { payload: { ...state.payload, asyncCount: (state.payload?.asyncCount || 0) + 1 } };
        }
    };
    return NotifyAction = _classThis;
})();
const actionFlow = [
    from(TestChat).next(AlphaAgent),
    from(AlphaAgent).next(SyncDbAction),
    from(SyncDbAction).next(BetaAgent),
    from(BetaAgent).next(TestAnswer),
];
const parallelFlow = [
    from(TestChat).nextParallel(AlphaAgent, NotifyAction),
    from(AlphaAgent, NotifyAction).next(TestAnswer),
];
// --- Tests ---
describe("@WorkflowAction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    const actionsResolver = (name) => {
        if (name === "sync-db")
            return new SyncDbAction();
        if (name === "notify-analytics")
            return new NotifyAction();
        throw new Error(`Unknown action: ${name}`);
    };
    it("executes the action sequentially within the graph, updating state", async () => {
        const deps = {
            ...fakeDeps({ "test/alpha": ["hello"], "test/beta": ["done"] }),
            flow: actionFlow,
            actions: actionsResolver,
        };
        const run = await runAgent({ task: "start" }, deps);
        expect(syncActionSpy).toHaveBeenCalled();
        expect(run.route).toEqual(["alpha", "beta"]); // Actions are not recorded in "route" since they are not agents!
        expect(run.finish).toBe("replyWith");
    });
    it("can execute an action in parallel with an agent", async () => {
        const deps = {
            ...fakeDeps({ "test/alpha": ["done"] }),
            flow: parallelFlow,
            actions: actionsResolver,
        };
        const run = await runAgent({ task: "start" }, deps);
        expect(parallelActionSpy).toHaveBeenCalled();
        expect(run.route).toEqual(["alpha"]);
        expect(run.finish).toBe("replyWith");
    });
});
