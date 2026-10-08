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
import { Agent, Workflow } from "../../src/core/index.js";
import { ComponentError } from "../../src/core/index.js";
import { workflowOf } from "../../src/testing/index.js";
import { recordComponent } from "../../src/components/metadata.js";
import { from, node } from "../../src/graph/flow.js";
import { Router } from "../../src/graph/router.decorator.js";
import { GraphRuleError } from "../../src/graph/rule-error.js";
import { WorkflowSettings } from "../../src/graph/settings.js";
import { usd } from "../../src/units/index.js";
import { TestAnswer, TestChat } from "../fixtures/test-flow/test.flow.js";
import { TestSettings } from "../fixtures/test-flow/star.js";
import { testConfig } from "../helpers.js";
const price = testConfig.agents.alpha.price;
const prompt = "./fixture/greeter.prompt.md";
let Profiler = (() => {
    let _classDecorators = [Agent({ name: "profiler", description: "Profiles", model: "test/alpha", price, prompt: "" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Profiler = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Profiler = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return Profiler = _classThis;
})();
let Scout = (() => {
    let _classDecorators = [Agent({ name: "scout", description: "Scouts", model: "test/alpha", price, prompt: "" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Scout = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Scout = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return Scout = _classThis;
})();
let Main = (() => {
    let _classDecorators = [Router({
            name: "main",
            description: "Picks an agent",
            prompt: "Pick one.",
            model: "typesafe/jev-1.13",
            maxVisits: 3,
            routes: [
                { prompt: "Profiling", target: Profiler },
                { prompt: "Done", target: TestAnswer },
            ],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Main = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Main = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return Main = _classThis;
})();
/** The profiler's second place in a flow — declared once, as a constant. */
const SecondLook = node(Profiler, "second-look");
const base = {
    version: "1.0.0",
    defaults: testConfig.defaults,
};
describe("AC1: a workflow's graph is its flow, checked at assembly", () => {
    it("M2: a cycle without a router and a choice without its route — both reported, with classes", async () => {
        let Broken = (() => {
            let _classDecorators = [Workflow({
                    ...base,
                    name: "broken",
                    flow: [
                        from(TestChat).next(Main),
                        from(Main).routes(Profiler, Scout, TestAnswer),
                        from(Profiler).next(Scout),
                        from(Scout).next(Profiler),
                    ],
                })];
            let _classDescriptor;
            let _classExtraInitializers = [];
            let _classThis;
            let _classSuper = TestSettings;
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
        const error = await workflowOf(Broken).catch((caught) => caught);
        expect(error).toBeInstanceOf(GraphRuleError);
        const codes = error instanceof GraphRuleError ? error.violations.map((v) => v.code) : [];
        expect(codes.sort()).toEqual(["graph.cycle-without-router", "router.routes-mismatch"]);
        expect(String(error)).toContain("Profiler");
        expect(String(error)).toContain("Scout");
    });
    it("the agents are the flow's agent nodes; limits come from settings(); routers are loaded", async () => {
        class Limited {
            settings() {
                return WorkflowSettings.builder()
                    .limits({ perDay: { cost: usd(3) } })
                    .build();
            }
        }
        let TwoPlaces = (() => {
            let _classDecorators = [Workflow({
                    ...base,
                    name: "two-places",
                    flow: [
                        from(TestChat).next(Main),
                        from(Main).routes(Profiler, TestAnswer),
                        from(Profiler).next(SecondLook),
                        from(SecondLook).next(Main),
                    ],
                })];
            let _classDescriptor;
            let _classExtraInitializers = [];
            let _classThis;
            let _classSuper = Limited;
            var TwoPlaces = class extends _classSuper {
                static { _classThis = this; }
                static {
                    const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
                    __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
                    TwoPlaces = _classThis = _classDescriptor.value;
                    if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
                    __runInitializers(_classThis, _classExtraInitializers);
                }
            };
            return TwoPlaces = _classThis;
        })();
        const workflow = await workflowOf(TwoPlaces);
        expect(Object.keys(workflow.config.agents)).toEqual(["profiler", "second-look"]);
        expect(workflow.limits).toEqual({ perDay: { cost: 3 } });
        const routerTexts = await Promise.all(workflow.routers.map(async (r) => [r.name, await r.instructions({})]));
        expect(routerTexts).toEqual([["main", "Pick one."]]);
    });
    it("a @Workflow class without settings() is refused", async () => {
        class NoSettings {
            kind = "not a workflow definition";
        }
        recordComponent(NoSettings, {
            kind: "workflow",
            meta: {
                ...base,
                name: "no-settings",
                flow: [from(TestChat).next(Profiler), from(Profiler).next(TestAnswer)],
            },
        });
        await expect(workflowOf(NoSettings)).rejects.toThrow(ComponentError);
        await expect(workflowOf(NoSettings)).rejects.toThrow("implement WorkflowDefinition");
    });
});
