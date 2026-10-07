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
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assembleFlowGraph } from "../../src/graph/build.js";
import { from, Self } from "../../src/graph/flow.js";
import { RouterDecisionError } from "../../src/graph/nodes/flow-router.js";
import { Router } from "../../src/graph/router.decorator.js";
import { flowRouterFactory, routerModelOf } from "../../src/graph/router-model.js";
import { fakeChatFactory, fakeGateway, usageRecord } from "../helpers.js";
import { codeReviewFlow } from "./fixtures/code-review.js";
import { scriptedRouter, testRuntime } from "./fixtures/nodes.js";
import { A, B, Done, Gate, Only, Pick, Start } from "./fixtures/rule-nodes.js";
const dir = mkdtempSync(join(tmpdir(), "router-texts-"));
const promptFile = join(dir, "how.prompt.md");
const routeFile = join(dir, "done.route.md");
writeFileSync(promptFile, "﻿\r\n\r\nLook at the review.\r\n  Keep indentation.\r\n\r\n");
writeFileSync(routeFile, "﻿The work is finished.\r\n");
let Texts = (() => {
    let _classDecorators = [Router({
            name: "texts",
            description: "Texts from files",
            prompt: "Decide carefully.\n\nLook at the review.\n  Keep indentation.",
            model: "typesafe/jev-1.13",
            routes: [
                { prompt: "Done:\n\nThe work is finished.", target: Done },
                { prompt: "Café work", target: A },
            ],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Texts = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Texts = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return Texts = _classThis;
})();
let Lost = (() => {
    let _classDecorators = [Router({
            name: "lost",
            prompt: "",
            description: "Its prompt file is missing",
            model: "typesafe/jev-1.13",
            routes: [{ prompt: "Finished", target: Done }],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Lost = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Lost = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return Lost = _classThis;
})();
const selfFlow = [
    from(Start).next(Pick),
    from(Pick).routes(A, B),
    from(A, B).next(Gate),
    from(Gate).routes(Self, Done),
];
async function run(flow, routers) {
    const { graph } = await assembleFlowGraph(flow, testRuntime(routers));
    return graph.invoke({ task: "do it" });
}
const gate = scriptedRouter("gate", []);
const failingWith = (outcome) => ({
    name: "pick",
    route: () => Promise.resolve(outcome),
});
describe("AC1: routers", () => {
    it("sends routes sorted by target name with the router's prompt as instructions", async () => {
        const main = scriptedRouter("main", ["explainer"]);
        await run(codeReviewFlow, { main, "review-gate": scriptedRouter("review-gate", []) });
        expect(main.requests[0]?.options).toEqual([
            { name: "coder", description: "Writing code" },
            { name: "explainer", description: "Explaining code" },
        ]);
        expect(main.requests[0]?.instructions).toBe("Pick who handles the message.");
    });
    it("joins prompt then files with one blank line, normalised (BOM, CRLF, edges, NFC)", async () => {
        const texts = scriptedRouter("texts", ["done"]);
        await run([from(Start).next(Texts), from(Texts).routes(A, Done), from(A).next(Done)], {
            texts,
        });
        expect(texts.requests[0]?.instructions).toBe("Decide carefully.\n\nLook at the review.\n  Keep indentation.");
        expect(texts.requests[0]?.options).toEqual([
            { name: "a", description: "Café work" },
            { name: "done", description: "Done:\n\nThe work is finished." },
        ]);
    });
    it("Self returns to the agent the router was called after", async () => {
        const state = await run(selfFlow, {
            pick: scriptedRouter("pick", ["b"]),
            gate: scriptedRouter("gate", ["self", "done"]),
        });
        expect(state.path).toEqual(["workflow-start.start", "pick", "b", "gate", "b", "gate", "done"]);
    });
    it("a returned option that is not a route fails the run with router.unknown-route", async () => {
        const error = await run(selfFlow, { pick: scriptedRouter("pick", ["ghost"]), gate }).catch((caught) => caught);
        expect(error).toBeInstanceOf(RouterDecisionError);
        expect(error).toMatchObject({ code: "router.unknown-route", router: "pick" });
    });
    it("an unknown option reported by the routing model is router.unknown-route, with its spend", async () => {
        const usage = usageRecord("router:pick", 0.01);
        const pick = failingWith({
            kind: "failed",
            reason: "unknown route: x",
            unknownOption: "x",
            usage,
        });
        await expect(run(selfFlow, { pick, gate })).rejects.toMatchObject({
            code: "router.unknown-route",
            usage: [usage],
        });
    });
    it("a failed decision call fails the run with router.failed and the model's reason", async () => {
        const pick = failingWith({ kind: "failed", reason: "router error: timeout" });
        await expect(run(selfFlow, { pick, gate })).rejects.toThrow('Router "pick" [router.failed]: router error: timeout');
    });
    let Chatty = (() => {
        let _classDecorators = [Router({
                name: "chatty",
                description: "Chatty",
                prompt: "Pick.",
                model: "test/router",
                routes: [
                    { prompt: "A", target: A },
                    { prompt: "Finished", target: Done },
                ],
            })];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis;
        var Chatty = class {
            static { _classThis = this; }
            static {
                const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
                __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
                Chatty = _classThis = _classDescriptor.value;
                if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
                __runInitializers(_classThis, _classExtraInitializers);
            }
        };
        return Chatty = _classThis;
    })();
    describe("AC1: routers through the existing routing strategies", () => {
        const deps = {
            gateway: fakeGateway(fakeChatFactory({ "test/router": ['{"next":"done","reason":"ok"}'] })),
            chatDefaults: { temperature: 0, thinking: "default", cache: false },
            chatModelSettings: (model) => ({
                model,
                price: { inputPerMTok: 1, outputPerMTok: 2 },
            }),
        };
        const runtime = testRuntime({}, { routerFor: flowRouterFactory(deps) });
        it("picks Jev for typesafe/jev-* and a chat model otherwise", () => {
            expect(routerModelOf("typesafe/jev-1.13", deps)).toEqual({
                kind: "jev",
                model: "typesafe/jev-1.13",
            });
            expect(routerModelOf("test/router", deps)).toMatchObject({
                kind: "llm",
                model: "test/router",
            });
        });
        it("a router with one route decides without a model call", async () => {
            const flow = [from(Start).next(A), from(A).next(Only), from(Only).routes(Done)];
            const { graph } = await assembleFlowGraph(flow, runtime);
            const state = await graph.invoke({ task: "go" });
            expect(state.path).toEqual(["workflow-start.start", "a", "only", "done"]);
            expect(state.routeReason).toBe("single option");
        });
        it("a chat-model router decides from the model's JSON and records its usage", async () => {
            const flow = [
                from(Start).next(Chatty),
                from(Chatty).routes(A, Done),
                from(A).next(Done),
            ];
            const { graph } = await assembleFlowGraph(flow, runtime);
            const state = await graph.invoke({ task: "go" });
            expect(state.path).toEqual(["workflow-start.start", "chatty", "done"]);
            expect(state.usage.map((record) => record.caller)).toEqual(["router:chatty"]);
        });
    });
});
