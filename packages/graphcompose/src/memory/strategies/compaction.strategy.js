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
import { SystemMessage } from "@langchain/core/messages";
import { MemoryStrategy } from "../decorator.js";
import { BaseMemoryStrategy } from "../types.js";
import { MemoryStorageError, MemoryCompactionError } from "../errors.js";
let StandardCompactionStrategy = (() => {
    let _classDecorators = [MemoryStrategy({
            windowSize: 10,
            compactEvery: 5,
            summariesToKeep: 3,
            llmModel: "openrouter:anthropic/claude-3-haiku",
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = BaseMemoryStrategy;
    var StandardCompactionStrategy = class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            StandardCompactionStrategy = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        storage;
        gateway;
        constructor(storage, gateway) {
            super();
            this.storage = storage;
            this.gateway = gateway;
        }
        async buildContext(messages, state, options) {
            let summaries;
            try {
                summaries = await this.storage.load(state.runId, "compaction") ?? [];
            }
            catch (e) {
                throw new MemoryStorageError(`Failed to load compaction summaries for run ${state.runId}`, e);
            }
            const rawWindow = messages.slice(-options.windowSize);
            if (summaries.length === 0) {
                return rawWindow;
            }
            const systemMsg = new SystemMessage(`Previously in conversation:\n${summaries.join("\n")}`);
            return [systemMsg, ...rawWindow];
        }
        async updateMemory(messages, state, options) {
            const overflow = messages.length - options.windowSize;
            if (overflow < options.compactEvery) {
                return;
            }
            const toCompact = messages.slice(0, options.compactEvery);
            let response;
            try {
                const model = this.gateway.chatModel({
                    purpose: "compaction",
                    model: options.llmModel,
                });
                response = await model.invoke([
                    new SystemMessage("Summarize the following conversation segment concisely. Retain all factual information."),
                    ...toCompact,
                ]);
            }
            catch (e) {
                throw new MemoryCompactionError(`LLM compaction failed for run ${state.runId}`, e);
            }
            const text = String(response.content).trim();
            if (!text) {
                throw new MemoryCompactionError(`LLM compaction returned empty summary for run ${state.runId}`);
            }
            let summaries;
            try {
                summaries = await this.storage.load(state.runId, "compaction") ?? [];
                summaries.push(text);
                if (summaries.length > options.summariesToKeep) {
                    summaries.shift();
                }
                await this.storage.save(state.runId, "compaction", summaries);
            }
            catch (e) {
                throw new MemoryStorageError(`Failed to save compaction summaries for run ${state.runId}`, e);
            }
        }
    };
    return StandardCompactionStrategy = _classThis;
})();
export { StandardCompactionStrategy };
