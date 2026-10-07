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
import { Decimal, Flag, ListOf, Nested, Text } from "../decorators.js";
import { markOpen } from "../metadata.js";
/** The text a workflow run starts with (the input of a text `@WorkflowStart`). */
let WorkflowStartText = (() => {
    let _text_decorators;
    let _text_initializers = [];
    let _text_extraInitializers = [];
    let _author_decorators;
    let _author_initializers = [];
    let _author_extraInitializers = [];
    return class WorkflowStartText {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _text_decorators = [Text({ prompt: "the text the run starts with", minLength: 1 })];
            _author_decorators = [Text({ prompt: "who or what sent it, if the caller knows", optional: true, sensitive: true })];
            __esDecorate(null, null, _text_decorators, { kind: "field", name: "text", static: false, private: false, access: { has: obj => "text" in obj, get: obj => obj.text, set: (obj, value) => { obj.text = value; } }, metadata: _metadata }, _text_initializers, _text_extraInitializers);
            __esDecorate(null, null, _author_decorators, { kind: "field", name: "author", static: false, private: false, access: { has: obj => "author" in obj, get: obj => obj.author, set: (obj, value) => { obj.author = value; } }, metadata: _metadata }, _author_initializers, _author_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        text = __runInitializers(this, _text_initializers, void 0);
        author = (__runInitializers(this, _text_extraInitializers), __runInitializers(this, _author_initializers, void 0));
        constructor() {
            __runInitializers(this, _author_extraInitializers);
        }
    };
})();
export { WorkflowStartText };
/** The text a workflow run finishes with (the output of a text `@WorkflowFinish`). */
let WorkflowFinishText = (() => {
    let _text_decorators;
    let _text_initializers = [];
    let _text_extraInitializers = [];
    return class WorkflowFinishText {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _text_decorators = [Text({ prompt: "the text the run finishes with, in plain words" })];
            __esDecorate(null, null, _text_decorators, { kind: "field", name: "text", static: false, private: false, access: { has: obj => "text" in obj, get: obj => obj.text, set: (obj, value) => { obj.text = value; } }, metadata: _metadata }, _text_initializers, _text_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        text = __runInitializers(this, _text_initializers, void 0);
        constructor() {
            __runInitializers(this, _text_extraInitializers);
        }
    };
})();
export { WorkflowFinishText };
/** What a workflow pause asks outside the run — a person or a system. */
let WorkflowPauseQuestion = (() => {
    let _question_decorators;
    let _question_initializers = [];
    let _question_extraInitializers = [];
    let _options_decorators;
    let _options_initializers = [];
    let _options_extraInitializers = [];
    return class WorkflowPauseQuestion {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _question_decorators = [Text({ prompt: "the question to ask, in one sentence" })];
            _options_decorators = [ListOf(Text, {
                    prompt: "answers to choose from, if the choice is closed",
                    optional: true,
                    maxItems: 6,
                })];
            __esDecorate(null, null, _question_decorators, { kind: "field", name: "question", static: false, private: false, access: { has: obj => "question" in obj, get: obj => obj.question, set: (obj, value) => { obj.question = value; } }, metadata: _metadata }, _question_initializers, _question_extraInitializers);
            __esDecorate(null, null, _options_decorators, { kind: "field", name: "options", static: false, private: false, access: { has: obj => "options" in obj, get: obj => obj.options, set: (obj, value) => { obj.options = value; } }, metadata: _metadata }, _options_initializers, _options_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        question = __runInitializers(this, _question_initializers, void 0);
        options = (__runInitializers(this, _question_extraInitializers), __runInitializers(this, _options_initializers, void 0));
        constructor() {
            __runInitializers(this, _options_extraInitializers);
        }
    };
})();
export { WorkflowPauseQuestion };
/** The answer to a workflow pause's question. */
let WorkflowPauseAnswer = (() => {
    let _answer_decorators;
    let _answer_initializers = [];
    let _answer_extraInitializers = [];
    return class WorkflowPauseAnswer {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _answer_decorators = [Text({ prompt: "the answer" })];
            __esDecorate(null, null, _answer_decorators, { kind: "field", name: "answer", static: false, private: false, access: { has: obj => "answer" in obj, get: obj => obj.answer, set: (obj, value) => { obj.answer = value; } }, metadata: _metadata }, _answer_initializers, _answer_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        answer = __runInitializers(this, _answer_initializers, void 0);
        constructor() {
            __runInitializers(this, _answer_extraInitializers);
        }
    };
})();
export { WorkflowPauseAnswer };
/** Any JSON object: the arguments of some tool (internal — not a concept of its own). */
export class ToolArguments {
}
markOpen(ToolArguments);
/** A tool call waiting for approval — one call per pause. */
let ToolCallApprovalAsk = (() => {
    let _callId_decorators;
    let _callId_initializers = [];
    let _callId_extraInitializers = [];
    let _tool_decorators;
    let _tool_initializers = [];
    let _tool_extraInitializers = [];
    let _arguments_decorators;
    let _arguments_initializers = [];
    let _arguments_extraInitializers = [];
    let _summary_decorators;
    let _summary_initializers = [];
    let _summary_extraInitializers = [];
    return class ToolCallApprovalAsk {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _callId_decorators = [Text({ prompt: "the id of the call being approved" })];
            _tool_decorators = [Text({ prompt: "the tool's name" })];
            _arguments_decorators = [Nested(ToolArguments, { prompt: "the arguments the tool would get" })];
            _summary_decorators = [Text({ prompt: "what the call will do, in one sentence" })];
            __esDecorate(null, null, _callId_decorators, { kind: "field", name: "callId", static: false, private: false, access: { has: obj => "callId" in obj, get: obj => obj.callId, set: (obj, value) => { obj.callId = value; } }, metadata: _metadata }, _callId_initializers, _callId_extraInitializers);
            __esDecorate(null, null, _tool_decorators, { kind: "field", name: "tool", static: false, private: false, access: { has: obj => "tool" in obj, get: obj => obj.tool, set: (obj, value) => { obj.tool = value; } }, metadata: _metadata }, _tool_initializers, _tool_extraInitializers);
            __esDecorate(null, null, _arguments_decorators, { kind: "field", name: "arguments", static: false, private: false, access: { has: obj => "arguments" in obj, get: obj => obj.arguments, set: (obj, value) => { obj.arguments = value; } }, metadata: _metadata }, _arguments_initializers, _arguments_extraInitializers);
            __esDecorate(null, null, _summary_decorators, { kind: "field", name: "summary", static: false, private: false, access: { has: obj => "summary" in obj, get: obj => obj.summary, set: (obj, value) => { obj.summary = value; } }, metadata: _metadata }, _summary_initializers, _summary_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        callId = __runInitializers(this, _callId_initializers, void 0);
        tool = (__runInitializers(this, _callId_extraInitializers), __runInitializers(this, _tool_initializers, void 0));
        arguments = (__runInitializers(this, _tool_extraInitializers), __runInitializers(this, _arguments_initializers, void 0));
        summary = (__runInitializers(this, _arguments_extraInitializers), __runInitializers(this, _summary_initializers, void 0));
        constructor() {
            __runInitializers(this, _summary_extraInitializers);
        }
    };
})();
export { ToolCallApprovalAsk };
/** The decision on one tool call waiting for approval. */
let ToolCallApprovalDecision = (() => {
    let _approved_decorators;
    let _approved_initializers = [];
    let _approved_extraInitializers = [];
    let _by_decorators;
    let _by_initializers = [];
    let _by_extraInitializers = [];
    let _feedback_decorators;
    let _feedback_initializers = [];
    let _feedback_extraInitializers = [];
    let _overrideArguments_decorators;
    let _overrideArguments_initializers = [];
    let _overrideArguments_extraInitializers = [];
    return class ToolCallApprovalDecision {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _approved_decorators = [Flag({ prompt: "true to run the call, false to refuse it" })];
            _by_decorators = [Text({ prompt: "who or what decided" })];
            _feedback_decorators = [Text({ prompt: "feedback or reason for rejection", optional: true })];
            _overrideArguments_decorators = [Nested(ToolArguments, { prompt: "arguments to override the call with", optional: true })];
            __esDecorate(null, null, _approved_decorators, { kind: "field", name: "approved", static: false, private: false, access: { has: obj => "approved" in obj, get: obj => obj.approved, set: (obj, value) => { obj.approved = value; } }, metadata: _metadata }, _approved_initializers, _approved_extraInitializers);
            __esDecorate(null, null, _by_decorators, { kind: "field", name: "by", static: false, private: false, access: { has: obj => "by" in obj, get: obj => obj.by, set: (obj, value) => { obj.by = value; } }, metadata: _metadata }, _by_initializers, _by_extraInitializers);
            __esDecorate(null, null, _feedback_decorators, { kind: "field", name: "feedback", static: false, private: false, access: { has: obj => "feedback" in obj, get: obj => obj.feedback, set: (obj, value) => { obj.feedback = value; } }, metadata: _metadata }, _feedback_initializers, _feedback_extraInitializers);
            __esDecorate(null, null, _overrideArguments_decorators, { kind: "field", name: "overrideArguments", static: false, private: false, access: { has: obj => "overrideArguments" in obj, get: obj => obj.overrideArguments, set: (obj, value) => { obj.overrideArguments = value; } }, metadata: _metadata }, _overrideArguments_initializers, _overrideArguments_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        approved = __runInitializers(this, _approved_initializers, void 0);
        by = (__runInitializers(this, _approved_extraInitializers), __runInitializers(this, _by_initializers, void 0));
        feedback = (__runInitializers(this, _by_extraInitializers), __runInitializers(this, _feedback_initializers, void 0));
        overrideArguments = (__runInitializers(this, _feedback_extraInitializers), __runInitializers(this, _overrideArguments_initializers, void 0));
        constructor() {
            __runInitializers(this, _overrideArguments_extraInitializers);
        }
    };
})();
export { ToolCallApprovalDecision };
/**
 * The input of a tool that takes nothing (`{}`). `extends Object` only because an empty class body is a
 * lint error; the class is as plain as `class NoInput {}`.
 */
export class NoInput extends Object {
}
/** Plain text, e.g. the result of an MCP server tool that returns text only. */
let PlainText = (() => {
    let _text_decorators;
    let _text_initializers = [];
    let _text_extraInitializers = [];
    return class PlainText {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _text_decorators = [Text({ prompt: "the text" })];
            __esDecorate(null, null, _text_decorators, { kind: "field", name: "text", static: false, private: false, access: { has: obj => "text" in obj, get: obj => obj.text, set: (obj, value) => { obj.text = value; } }, metadata: _metadata }, _text_initializers, _text_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        text = __runInitializers(this, _text_initializers, void 0);
        constructor() {
            __runInitializers(this, _text_extraInitializers);
        }
    };
})();
export { PlainText };
/** A piece of text a knowledge base (`@Rag`) found for a query. */
let RagSearchResult = (() => {
    let _text_decorators;
    let _text_initializers = [];
    let _text_extraInitializers = [];
    let _source_decorators;
    let _source_initializers = [];
    let _source_extraInitializers = [];
    let _score_decorators;
    let _score_initializers = [];
    let _score_extraInitializers = [];
    return class RagSearchResult {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _text_decorators = [Text({ prompt: "the found text" })];
            _source_decorators = [Text({ prompt: "where it comes from: a document, a page, a file" })];
            _score_decorators = [Decimal({ prompt: "how well it matches the query, from 0 to 1", optional: true, min: 0, max: 1 })];
            __esDecorate(null, null, _text_decorators, { kind: "field", name: "text", static: false, private: false, access: { has: obj => "text" in obj, get: obj => obj.text, set: (obj, value) => { obj.text = value; } }, metadata: _metadata }, _text_initializers, _text_extraInitializers);
            __esDecorate(null, null, _source_decorators, { kind: "field", name: "source", static: false, private: false, access: { has: obj => "source" in obj, get: obj => obj.source, set: (obj, value) => { obj.source = value; } }, metadata: _metadata }, _source_initializers, _source_extraInitializers);
            __esDecorate(null, null, _score_decorators, { kind: "field", name: "score", static: false, private: false, access: { has: obj => "score" in obj, get: obj => obj.score, set: (obj, value) => { obj.score = value; } }, metadata: _metadata }, _score_initializers, _score_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        text = __runInitializers(this, _text_initializers, void 0);
        source = (__runInitializers(this, _text_extraInitializers), __runInitializers(this, _source_initializers, void 0));
        score = (__runInitializers(this, _source_extraInitializers), __runInitializers(this, _score_initializers, void 0));
        constructor() {
            __runInitializers(this, _score_extraInitializers);
        }
    };
})();
export { RagSearchResult };
