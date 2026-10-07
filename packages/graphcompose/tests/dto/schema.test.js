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
/** #118 AC5: the JSON Schema the model sees for a DTO. */
import { describe, expect, it } from "vitest";
import { Integer, ListOf, NoInput, OneOf, Text } from "../../src/dto/index.js";
import { jsonSchemaOf } from "../../src/dto/schema.js";
let Task = (() => {
    let _title_decorators;
    let _title_initializers = [];
    let _title_extraInitializers = [];
    let _priority_decorators;
    let _priority_initializers = [];
    let _priority_extraInitializers = [];
    let _minutes_decorators;
    let _minutes_initializers = [];
    let _minutes_extraInitializers = [];
    let _labels_decorators;
    let _labels_initializers = [];
    let _labels_extraInitializers = [];
    let _owner_decorators;
    let _owner_initializers = [];
    let _owner_extraInitializers = [];
    return class Task {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _title_decorators = [Text({ prompt: "what to do", example: "write tests" })];
            _priority_decorators = [OneOf({ values: ["low", "high"], prompt: "how urgent" })];
            _minutes_decorators = [Integer({ prompt: "minutes it may take", min: 1, default: 30 })];
            _labels_decorators = [ListOf(Text, { optional: true, maxItems: 3 })];
            _owner_decorators = [Text({ sensitive: true })];
            __esDecorate(null, null, _title_decorators, { kind: "field", name: "title", static: false, private: false, access: { has: obj => "title" in obj, get: obj => obj.title, set: (obj, value) => { obj.title = value; } }, metadata: _metadata }, _title_initializers, _title_extraInitializers);
            __esDecorate(null, null, _priority_decorators, { kind: "field", name: "priority", static: false, private: false, access: { has: obj => "priority" in obj, get: obj => obj.priority, set: (obj, value) => { obj.priority = value; } }, metadata: _metadata }, _priority_initializers, _priority_extraInitializers);
            __esDecorate(null, null, _minutes_decorators, { kind: "field", name: "minutes", static: false, private: false, access: { has: obj => "minutes" in obj, get: obj => obj.minutes, set: (obj, value) => { obj.minutes = value; } }, metadata: _metadata }, _minutes_initializers, _minutes_extraInitializers);
            __esDecorate(null, null, _labels_decorators, { kind: "field", name: "labels", static: false, private: false, access: { has: obj => "labels" in obj, get: obj => obj.labels, set: (obj, value) => { obj.labels = value; } }, metadata: _metadata }, _labels_initializers, _labels_extraInitializers);
            __esDecorate(null, null, _owner_decorators, { kind: "field", name: "owner", static: false, private: false, access: { has: obj => "owner" in obj, get: obj => obj.owner, set: (obj, value) => { obj.owner = value; } }, metadata: _metadata }, _owner_initializers, _owner_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        title = __runInitializers(this, _title_initializers, void 0);
        priority = (__runInitializers(this, _title_extraInitializers), __runInitializers(this, _priority_initializers, void 0));
        minutes = (__runInitializers(this, _priority_extraInitializers), __runInitializers(this, _minutes_initializers, void 0));
        labels = (__runInitializers(this, _minutes_extraInitializers), __runInitializers(this, _labels_initializers, void 0));
        owner = (__runInitializers(this, _labels_extraInitializers), __runInitializers(this, _owner_initializers, void 0));
        constructor() {
            __runInitializers(this, _owner_extraInitializers);
        }
    };
})();
describe("DTO JSON Schema (#118)", () => {
    it("AC5: declaration order, description = prompt, examples, io input, no $schema", () => {
        // JSON text keeps the order the model reads (a snapshot of the object would sort keys)
        expect(JSON.stringify(jsonSchemaOf(Task), null, 2)).toMatchInlineSnapshot(`
      "{
        "type": "object",
        "properties": {
          "title": {
            "type": "string",
            "description": "what to do",
            "examples": [
              "write tests"
            ]
          },
          "priority": {
            "type": "string",
            "enum": [
              "low",
              "high"
            ],
            "description": "how urgent"
          },
          "minutes": {
            "default": 30,
            "description": "minutes it may take",
            "type": "integer",
            "minimum": 1,
            "maximum": 9007199254740991
          },
          "labels": {
            "maxItems": 3,
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "owner": {
            "type": "string"
          }
        },
        "required": [
          "title",
          "priority",
          "owner"
        ]
      }"
    `);
    });
    it("AC5: property order follows declaration order", () => {
        let Reversed = (() => {
            let _zeta_decorators;
            let _zeta_initializers = [];
            let _zeta_extraInitializers = [];
            let _alpha_decorators;
            let _alpha_initializers = [];
            let _alpha_extraInitializers = [];
            return class Reversed {
                static {
                    const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
                    _zeta_decorators = [Text()];
                    _alpha_decorators = [Text()];
                    __esDecorate(null, null, _zeta_decorators, { kind: "field", name: "zeta", static: false, private: false, access: { has: obj => "zeta" in obj, get: obj => obj.zeta, set: (obj, value) => { obj.zeta = value; } }, metadata: _metadata }, _zeta_initializers, _zeta_extraInitializers);
                    __esDecorate(null, null, _alpha_decorators, { kind: "field", name: "alpha", static: false, private: false, access: { has: obj => "alpha" in obj, get: obj => obj.alpha, set: (obj, value) => { obj.alpha = value; } }, metadata: _metadata }, _alpha_initializers, _alpha_extraInitializers);
                    if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
                }
                zeta = __runInitializers(this, _zeta_initializers, void 0);
                alpha = (__runInitializers(this, _zeta_extraInitializers), __runInitializers(this, _alpha_initializers, void 0));
                constructor() {
                    __runInitializers(this, _alpha_extraInitializers);
                }
            };
        })();
        expect(Object.keys(jsonSchemaOf(Reversed).properties)).toEqual(["zeta", "alpha"]);
    });
    it("AC5: an empty DTO is an object with no properties", () => {
        expect(jsonSchemaOf(NoInput)).toEqual({ type: "object", properties: {} });
    });
});
