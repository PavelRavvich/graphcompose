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
import { Agent, WorkflowAction, Workflow } from "../../src/components/decorators.js";
import { from, catchError } from "../../src/router/index.js";
import { WorkflowStart, WorkflowFinish, LocalSagaStrategy } from "../../src/core/index.js";
import { testWith } from "../../src/testing/test-with.js";
const logs = [];
let CancelPaymentAction = (() => {
    let _classDecorators = [WorkflowAction({ name: "cancel_payment" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var CancelPaymentAction = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CancelPaymentAction = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async execute() {
            logs.push("cancel_payment");
            return { payload: { canceled: true } };
        }
    };
    return CancelPaymentAction = _classThis;
})();
let CancelHotelAction = (() => {
    let _classDecorators = [WorkflowAction({ name: "cancel_hotel" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var CancelHotelAction = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CancelHotelAction = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async execute() {
            logs.push("cancel_hotel");
            return { payload: { hotel_canceled: true } };
        }
    };
    return CancelHotelAction = _classThis;
})();
let BookHotelAgent = (() => {
    let _classDecorators = [Agent({ name: "book_hotel", compensate: CancelHotelAction })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var BookHotelAgent = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            BookHotelAgent = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async run() {
            logs.push("book_hotel");
            return {};
        }
    };
    return BookHotelAgent = _classThis;
})();
let ProcessPaymentAgent = (() => {
    let _classDecorators = [Agent({ name: "process_payment", compensate: CancelPaymentAction })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ProcessPaymentAgent = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ProcessPaymentAgent = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async run() {
            logs.push("process_payment");
            return {};
        }
    };
    return ProcessPaymentAgent = _classThis;
})();
let BookFlightAgent = (() => {
    let _classDecorators = [Agent({ name: "book_flight" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var BookFlightAgent = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            BookFlightAgent = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async run() {
            throw new Error("Flight fully booked");
        }
    };
    return BookFlightAgent = _classThis;
})();
let VacationBookingWorkflow = (() => {
    let _classDecorators = [Workflow({
            name: "vacation_booking",
            version: "1.0",
            flow: [
                from(WorkflowStart).next(BookHotelAgent),
                from(BookHotelAgent).next(ProcessPaymentAgent),
                from(ProcessPaymentAgent).next(BookFlightAgent),
                // Route any error in book_flight to LocalSagaStrategy to trigger rollbacks
                catchError(BookFlightAgent, Error).compensateWith(LocalSagaStrategy),
                from(LocalSagaStrategy).next(WorkflowFinish)
            ]
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var VacationBookingWorkflow = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            VacationBookingWorkflow = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return VacationBookingWorkflow = _classThis;
})();
describe("Saga Orchestration", () => {
    it("executes compensators in reverse order upon failure", async () => {
        logs.length = 0; // reset
        await testWith(VacationBookingWorkflow, async (app) => {
            // Mock the agents to just execute and not actually call LLM
            app.script(BookHotelAgent, async () => {
                logs.push("book_hotel");
                return { payload: { step: 1 } };
            });
            app.script(ProcessPaymentAgent, async () => {
                logs.push("process_payment");
                return { payload: { step: 2 } };
            });
            app.script(BookFlightAgent, async () => {
                throw new Error("Flight fully booked");
            });
            const res = await app.run({});
            expect(res.status).toBe("completed");
            // Expected execution order:
            // 1. book_hotel
            // 2. process_payment
            // 3. Error in book_flight -> routed to LocalSagaStrategy
            // 4. LocalSagaStrategy finds book_hotel and process_payment in history
            // 5. Compensates in reverse: cancel_payment -> cancel_hotel
            expect(logs).toEqual([
                "book_hotel",
                "process_payment",
                "cancel_payment",
                "cancel_hotel"
            ]);
        });
    });
});
