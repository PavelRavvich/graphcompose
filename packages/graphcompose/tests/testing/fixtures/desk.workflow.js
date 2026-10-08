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
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Agent, Injectable, Workflow } from "../../../src/core/index.js";
import { McpServer, McpServerClient, McpTool } from "../../../src/mcp/index.js";
import { MODEL_MAX } from "../../../src/index.js";
import { TerminalUserChannel } from "../../../src/channels/terminal-channel.js";
import { Tool } from "../../../src/tool/index.js";
import { Text, WorkflowFinishText, WorkflowStartText } from "../../../src/dto/index.js";
import { from, Router, WorkflowFinish, WorkflowSettings, WorkflowStart, } from "../../../src/graph/index.js";
import { usd } from "../../../src/units/index.js";
/** What the lifecycle hooks of real components did, in order (the lifecycle tests read it). */
export const lifecycle = [];
/** A service with lifecycle hooks: started when the app is built, stopped when it closes. */
let OrderBook = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var OrderBook = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            OrderBook = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        onStart() {
            lifecycle.push("OrderBook.onStart");
        }
        onStop() {
            lifecycle.push("OrderBook.onStop");
        }
        statusOf(orderId) {
            return Promise.resolve(`order ${orderId} shipped`);
        }
    };
    return OrderBook = _classThis;
})();
export { OrderBook };
let OrderQuery = (() => {
    let _orderId_decorators;
    let _orderId_initializers = [];
    let _orderId_extraInitializers = [];
    return class OrderQuery {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _orderId_decorators = [Text({ prompt: "the order id" })];
            __esDecorate(null, null, _orderId_decorators, { kind: "field", name: "orderId", static: false, private: false, access: { has: obj => "orderId" in obj, get: obj => obj.orderId, set: (obj, value) => { obj.orderId = value; } }, metadata: _metadata }, _orderId_initializers, _orderId_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        orderId = __runInitializers(this, _orderId_initializers, void 0);
        constructor() {
            __runInitializers(this, _orderId_extraInitializers);
        }
    };
})();
export { OrderQuery };
let OrderInfo = (() => {
    let _status_decorators;
    let _status_initializers = [];
    let _status_extraInitializers = [];
    return class OrderInfo {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _status_decorators = [Text()];
            __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: obj => "status" in obj, get: obj => obj.status, set: (obj, value) => { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        status = __runInitializers(this, _status_initializers, void 0);
        constructor() {
            __runInitializers(this, _status_extraInitializers);
        }
    };
})();
export { OrderInfo };
let OrderStatus = (() => {
    let _classDecorators = [Tool({
            name: "order_status",
            description: "The status of an order",
            input: OrderQuery,
            output: OrderInfo,
            deps: [OrderBook],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var OrderStatus = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            OrderStatus = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        book;
        constructor(book) {
            this.book = book;
        }
        async run({ orderId }) {
            return { status: await this.book.statusOf(orderId) };
        }
    };
    return OrderStatus = _classThis;
})();
export { OrderStatus };
let FileRead = (() => {
    let _path_decorators;
    let _path_initializers = [];
    let _path_extraInitializers = [];
    return class FileRead {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _path_decorators = [Text()];
            __esDecorate(null, null, _path_decorators, { kind: "field", name: "path", static: false, private: false, access: { has: obj => "path" in obj, get: obj => obj.path, set: (obj, value) => { obj.path = value; } }, metadata: _metadata }, _path_initializers, _path_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        path = __runInitializers(this, _path_initializers, void 0);
        constructor() {
            __runInitializers(this, _path_extraInitializers);
        }
    };
})();
let FileContent = (() => {
    let _content_decorators;
    let _content_initializers = [];
    let _content_extraInitializers = [];
    return class FileContent {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _content_decorators = [Text()];
            __esDecorate(null, null, _content_decorators, { kind: "field", name: "content", static: false, private: false, access: { has: obj => "content" in obj, get: obj => obj.content, set: (obj, value) => { obj.content = value; } }, metadata: _metadata }, _content_initializers, _content_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        content = __runInitializers(this, _content_initializers, void 0);
        constructor() {
            __runInitializers(this, _content_extraInitializers);
        }
    };
})();
let FileWrite = (() => {
    let _path_decorators;
    let _path_initializers = [];
    let _path_extraInitializers = [];
    let _content_decorators;
    let _content_initializers = [];
    let _content_extraInitializers = [];
    return class FileWrite {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _path_decorators = [Text()];
            _content_decorators = [Text()];
            __esDecorate(null, null, _path_decorators, { kind: "field", name: "path", static: false, private: false, access: { has: obj => "path" in obj, get: obj => obj.path, set: (obj, value) => { obj.path = value; } }, metadata: _metadata }, _path_initializers, _path_extraInitializers);
            __esDecorate(null, null, _content_decorators, { kind: "field", name: "content", static: false, private: false, access: { has: obj => "content" in obj, get: obj => obj.content, set: (obj, value) => { obj.content = value; } }, metadata: _metadata }, _content_initializers, _content_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        path = __runInitializers(this, _path_initializers, void 0);
        content = (__runInitializers(this, _path_extraInitializers), __runInitializers(this, _content_initializers, void 0));
        constructor() {
            __runInitializers(this, _content_extraInitializers);
        }
    };
})();
let FileWritten = (() => {
    let _content_decorators;
    let _content_initializers = [];
    let _content_extraInitializers = [];
    return class FileWritten {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _content_decorators = [Text()];
            __esDecorate(null, null, _content_decorators, { kind: "field", name: "content", static: false, private: false, access: { has: obj => "content" in obj, get: obj => obj.content, set: (obj, value) => { obj.content = value; } }, metadata: _metadata }, _content_initializers, _content_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        content = __runInitializers(this, _content_initializers, void 0);
        constructor() {
            __runInitializers(this, _content_extraInitializers);
        }
    };
})();
/** The folder the notes server may touch. */
export const NOTES_DIR = tmpdir();
const FILESYSTEM_SERVER = join(dirname(createRequire(import.meta.url).resolve("@modelcontextprotocol/server-filesystem/package.json")), "dist", "index.js");
const notesTools = {
    read_text_file: { input: FileRead, output: FileContent },
    write_file: { input: FileWrite, output: FileWritten },
};
/** A real MCP server (the official filesystem server, a local process — no network). */
let NotesServer = (() => {
    let _classDecorators = [McpServer({
            name: "notes",
            transport: "stdio",
            command: process.execPath,
            args: [FILESYSTEM_SERVER, NOTES_DIR],
            tools: notesTools,
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = McpServerClient;
    var NotesServer = class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            NotesServer = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return NotesServer = _classThis;
})();
export { NotesServer };
let Note = (() => {
    let _title_decorators;
    let _title_initializers = [];
    let _title_extraInitializers = [];
    let _text_decorators;
    let _text_initializers = [];
    let _text_extraInitializers = [];
    return class Note {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _title_decorators = [Text()];
            _text_decorators = [Text()];
            __esDecorate(null, null, _title_decorators, { kind: "field", name: "title", static: false, private: false, access: { has: obj => "title" in obj, get: obj => obj.title, set: (obj, value) => { obj.title = value; } }, metadata: _metadata }, _title_initializers, _title_extraInitializers);
            __esDecorate(null, null, _text_decorators, { kind: "field", name: "text", static: false, private: false, access: { has: obj => "text" in obj, get: obj => obj.text, set: (obj, value) => { obj.text = value; } }, metadata: _metadata }, _text_initializers, _text_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        title = __runInitializers(this, _title_initializers, void 0);
        text = (__runInitializers(this, _title_extraInitializers), __runInitializers(this, _text_initializers, void 0));
        constructor() {
            __runInitializers(this, _text_extraInitializers);
        }
    };
})();
export { Note };
let NoteRef = (() => {
    let _title_decorators;
    let _title_initializers = [];
    let _title_extraInitializers = [];
    return class NoteRef {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _title_decorators = [Text()];
            __esDecorate(null, null, _title_decorators, { kind: "field", name: "title", static: false, private: false, access: { has: obj => "title" in obj, get: obj => obj.title, set: (obj, value) => { obj.title = value; } }, metadata: _metadata }, _title_initializers, _title_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        title = __runInitializers(this, _title_initializers, void 0);
        constructor() {
            __runInitializers(this, _title_extraInitializers);
        }
    };
})();
export { NoteRef };
let NoteText = (() => {
    let _text_decorators;
    let _text_initializers = [];
    let _text_extraInitializers = [];
    return class NoteText {
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
export { NoteText };
const notePath = (title) => join(NOTES_DIR, `${title}.md`);
let SaveNote = (() => {
    let _classDecorators = [McpTool({
            server: NotesServer,
            name: "save_note",
            description: "Saves a note",
            channel: TerminalUserChannel,
            input: Note,
            output: NoteRef,
            deps: [NotesServer],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var SaveNote = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            SaveNote = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        server;
        constructor(server) {
            this.server = server;
        }
        async run({ title, text }) {
            await this.server.call("write_file", { path: notePath(title), content: text });
            return { title };
        }
    };
    return SaveNote = _classThis;
})();
export { SaveNote };
let ReadNote = (() => {
    let _classDecorators = [McpTool({
            server: NotesServer,
            name: "read_note",
            description: "Reads a note",
            input: NoteRef,
            output: NoteText,
            deps: [NotesServer],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ReadNote = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ReadNote = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        server;
        constructor(server) {
            this.server = server;
        }
        async run({ title }) {
            return { text: (await this.server.call("read_text_file", { path: notePath(title) })).content };
        }
    };
    return ReadNote = _classThis;
})();
export { ReadNote };
const price = { inputPerMTok: 1, outputPerMTok: 10 };
let Support = (() => {
    let _classDecorators = [Agent({
            name: "support",
            prompt: "./support.prompt.md",
            description: "Answers questions about orders and keeps notes",
            model: "test/support",
            price,
            tools: [OrderStatus, ReadNote, SaveNote],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Support = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Support = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return Support = _classThis;
})();
export { Support };
let Writer = (() => {
    let _classDecorators = [Agent({
            name: "writer",
            promptUrls: ["./writer.prompt.md"],
            description: "Writes replies",
            model: "test/writer",
            price,
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Writer = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Writer = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return Writer = _classThis;
})();
export { Writer };
let ChatStart = (() => {
    let _classDecorators = [WorkflowStart({ name: "chat", description: "A message", input: WorkflowStartText })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ChatStart = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ChatStart = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return ChatStart = _classThis;
})();
export { ChatStart };
let Reply = (() => {
    let _classDecorators = [WorkflowFinish({ name: "reply", description: "The reply", output: WorkflowFinishText })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Reply = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Reply = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return Reply = _classThis;
})();
export { Reply };
let MainRouter = (() => {
    let _classDecorators = [Router({
            name: "main",
            description: "Sends the message to an agent, or sends the reply",
            prompt: "Pick who handles the message.",
            model: "typesafe/jev-1.13",
            maxVisits: 4,
            routes: [
                { prompt: "Orders and notes", target: Support },
                { prompt: "Writing replies", target: Writer },
                {
                    prompt: "Stop and send the replyWith: the contributions replyWith the message",
                    target: Reply,
                },
            ],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MainRouter = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MainRouter = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return MainRouter = _classThis;
})();
export { MainRouter };
/** The testing toolkit's own workflow: a star with a service, a tool, an MCP server, a pause. */
let Desk = (() => {
    let _classDecorators = [Workflow({
            name: "desk",
            version: "1.0.0",
            flow: [
                from(ChatStart).next(MainRouter),
                from(MainRouter).routes(Support, Writer, Reply),
                from(Support, Writer).next(MainRouter),
            ],
            defaults: {
                models: { temperature: 0, maxTokens: MODEL_MAX, thinking: "default", cache: true },
                router: { kind: "jev", model: "typesafe/jev-1.13" },
                tools: { maxToolCalls: 4 },
                history: { limit: 4 },
            },
            guards: {
                input: { prompt_injection: { threshold: 0.7, refusal: "I can't help with that." } },
            },
            mcp: [NotesServer],
            providers: [OrderBook],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Desk = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Desk = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        settings() {
            return WorkflowSettings.builder()
                .limits({ perRun: { steps: 12 }, perDay: { cost: usd(0.05) } })
                .build();
        }
    };
    return Desk = _classThis;
})();
export { Desk };
