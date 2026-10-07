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
import { describe, expect, it, vi } from "vitest";
import { assembleFlowGraph } from "../../src/graph/build.js";
import { from, Self } from "../../src/graph/flow.js";
import { LimitExceededError } from "../../src/graph/limits.js";
import { Router } from "../../src/graph/router.decorator.js";
import { WorkflowSettings, WorkflowSettingsError, } from "../../src/graph/settings.js";
import { minutes, seconds, UnitError, usd } from "../../src/units/index.js";
import { scriptedRouter, testRunner, testRuntime } from "./fixtures/nodes.js";
import { A, B, Done, Gate, Pick, Start } from "./fixtures/rule-nodes.js";
let Loop = (() => {
    let _classDecorators = [Router({
            name: "loop",
            description: "At most twice",
            prompt: "Again?",
            model: "typesafe/jev-1.13",
            maxVisits: 2,
            routes: [
                { prompt: "Once more", target: Self },
                { prompt: "Enough", target: Done },
            ],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Loop = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Loop = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return Loop = _classThis;
})();
const selfFlow = [
    from(Start).next(Pick),
    from(Pick).routes(A, B),
    from(A, B).next(Gate),
    from(Gate).routes(Self, Done),
];
const loopFlow = [from(Start).next(A), from(A).next(Loop), from(Loop).routes(Self, Done)];
const forever = (name) => scriptedRouter(name, Array(100).fill("self"));
async function failureOf(flow, runtime) {
    const { graph } = await assembleFlowGraph(flow, runtime);
    const error = await graph.invoke({ task: "go" }).catch((caught) => caught);
    if (error instanceof LimitExceededError)
        return error;
    throw new Error(`expected LimitExceededError, got ${String(error)}`);
}
const costly = (perAgentUsd) => ({
    runnerFor: (node) => testRunner(node, perAgentUsd),
});
describe("AC1: limits fail the run with their key, path and spend", () => {
    it("limits.perRun.steps defaults to (agents + routers) × 3", async () => {
        const error = await failureOf(selfFlow, testRuntime({ pick: scriptedRouter("pick", ["b"]), gate: forever("gate") }));
        expect(error).toMatchObject({ key: "limits.perRun.steps", limit: 12, actual: 13 });
        expect(error.path.slice(0, 5)).toEqual(["workflow-start.start", "pick", "b", "gate", "b"]);
        expect(error.path).toHaveLength(14);
    });
    it("limits.perRun.steps: the last allowed visit passes, one more fails", async () => {
        const flow = [from(Start).next(A), from(A).next(Done)];
        const exact = await assembleFlowGraph(flow, testRuntime({}, { limits: { perRun: { steps: 1 } } }));
        const over = [from(Start).next(Pick), from(Pick).routes(A, B), from(A, B).next(Done)];
        await expect(exact.graph.invoke({ task: "go" })).resolves.toMatchObject({ steps: 1 });
        await expect(failureOf(over, testRuntime({ pick: scriptedRouter("pick", ["a"]) }, { limits: { perRun: { steps: 1 } } }))).resolves.toMatchObject({
            key: "limits.perRun.steps",
            path: ["workflow-start.start", "pick", "a"],
        });
    });
    it("routers.<name>.maxVisits is reached inside a cycle while steps remain", async () => {
        const error = await failureOf(loopFlow, testRuntime({ loop: forever("loop") }));
        expect(error).toMatchObject({ key: "routers.loop.maxVisits", limit: 2, actual: 3 });
        expect(error.path).toEqual(["workflow-start.start", "a", "loop", "a", "loop", "a", "loop"]);
    });
    it("limits.perRun.cost fails before the next working node once the run has spent it", async () => {
        const runtime = testRuntime({ gate: forever("gate"), pick: scriptedRouter("pick", ["a"]) }, {
            ...costly(0.05),
            limits: { perRun: { cost: usd(0.1) } },
        });
        const error = await failureOf(selfFlow, runtime);
        expect(error).toMatchObject({ key: "limits.perRun.cost", limit: 0.1, spentUsd: 0.1 });
        expect(error.message).toContain("limits.perRun.cost");
        expect(error.message).toContain("start → pick → a → gate → a → gate");
        expect(error.message).toContain("spent $0.1000");
    });
    it("limits.perDay.cost counts what the workflow spent today before the run, read once", async () => {
        const spentToday = vi.fn(() => Promise.resolve(0.95));
        const runtime = testRuntime({ gate: forever("gate"), pick: scriptedRouter("pick", ["a"]) }, {
            ...costly(0.05),
            spentToday,
            limits: { perDay: { cost: usd(1) } },
        });
        const error = await failureOf(selfFlow, runtime);
        expect(error).toMatchObject({ key: "limits.perDay.cost", limit: 1, spentUsd: 0.05 });
        expect(error.actual).toBeCloseTo(1);
        expect(spentToday).toHaveBeenCalledTimes(1);
    });
    it("the ledger is not read when there is no daily limit", async () => {
        const spentToday = vi.fn(() => Promise.resolve(0));
        const { graph } = await assembleFlowGraph([from(Start).next(A), from(A).next(Done)], testRuntime({}, { spentToday }));
        await graph.invoke({ task: "go" });
        expect(spentToday).not.toHaveBeenCalled();
    });
});
describe("AC1: workflow settings and units", () => {
    class TestWorkflow {
        settings() {
            return WorkflowSettings.builder()
                .limits({ perRun: { steps: 30, cost: usd(0.5) }, perDay: { cost: usd(5) } })
                .build();
        }
    }
    it("settings() returns the limits set through the builder", () => {
        expect(new TestWorkflow().settings().limits).toEqual({
            perRun: { steps: 30, cost: 0.5 },
            perDay: { cost: 5 },
        });
        expect(WorkflowSettings.builder().build().limits).toEqual({});
    });
    it("rejects steps that are not a positive integer", () => {
        expect(() => WorkflowSettings.builder().limits({ perRun: { steps: 0 } })).toThrow(WorkflowSettingsError);
    });
    it("usd, seconds and minutes carry checked amounts", () => {
        expect([usd(0.5), seconds(2), minutes(1)]).toEqual([0.5, 2000, 60_000]);
        expect(() => usd(-1)).toThrow(UnitError);
        expect(() => seconds(Number.NaN)).toThrow(UnitError);
    });
});
