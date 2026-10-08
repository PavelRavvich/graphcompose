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
/**
 * #118 AC5 (narrowed, #113 correction 1): what the compiler checks on a DTO. `make check` runs `tsc`
 * over tests/: every `@ts-expect-error` below must stay an error, or the build fails.
 */
import { describe, expect, it } from "vitest";
import { CurrencyCode, Date, Decimal, Email, Flag, Integer, ListOf, Nested, OneOf, Text, } from "../../src/dto/index.js";
import { fieldsOf } from "../../src/dto/metadata.js";
let Issue = (() => {
    let _title_decorators;
    let _title_initializers = [];
    let _title_extraInitializers = [];
    return class Issue {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _title_decorators = [Text({ prompt: "one line" })];
            __esDecorate(null, null, _title_decorators, { kind: "field", name: "title", static: false, private: false, access: { has: obj => "title" in obj, get: obj => obj.title, set: (obj, value) => { obj.title = value; } }, metadata: _metadata }, _title_initializers, _title_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        title = __runInitializers(this, _title_initializers, void 0);
        constructor() {
            __runInitializers(this, _title_extraInitializers);
        }
    };
})();
let Review = (() => {
    let _summary_decorators;
    let _summary_initializers = [];
    let _summary_extraInitializers = [];
    let _score_decorators;
    let _score_initializers = [];
    let _score_extraInitializers = [];
    let _weight_decorators;
    let _weight_initializers = [];
    let _weight_extraInitializers = [];
    let _approved_decorators;
    let _approved_initializers = [];
    let _approved_extraInitializers = [];
    let _kind_decorators;
    let _kind_initializers = [];
    let _kind_extraInitializers = [];
    let _issues_decorators;
    let _issues_initializers = [];
    let _issues_extraInitializers = [];
    let _tags_decorators;
    let _tags_initializers = [];
    let _tags_extraInitializers = [];
    let _main_decorators;
    let _main_initializers = [];
    let _main_extraInitializers = [];
    let _day_decorators;
    let _day_initializers = [];
    let _day_extraInitializers = [];
    return class Review {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _summary_decorators = [Text({ prompt: "what changed", maxLength: 200 })];
            _score_decorators = [Integer({ optional: true, min: 0 })];
            _weight_decorators = [Decimal({ default: 0.5 })];
            _approved_decorators = [Flag()];
            _kind_decorators = [OneOf({ values: ["file", "folder"] })];
            _issues_decorators = [ListOf(Issue, { minItems: 1 })];
            _tags_decorators = [ListOf(Text, { optional: true })];
            _main_decorators = [Nested(Issue, { optional: true })];
            _day_decorators = [Date()];
            __esDecorate(null, null, _summary_decorators, { kind: "field", name: "summary", static: false, private: false, access: { has: obj => "summary" in obj, get: obj => obj.summary, set: (obj, value) => { obj.summary = value; } }, metadata: _metadata }, _summary_initializers, _summary_extraInitializers);
            __esDecorate(null, null, _score_decorators, { kind: "field", name: "score", static: false, private: false, access: { has: obj => "score" in obj, get: obj => obj.score, set: (obj, value) => { obj.score = value; } }, metadata: _metadata }, _score_initializers, _score_extraInitializers);
            __esDecorate(null, null, _weight_decorators, { kind: "field", name: "weight", static: false, private: false, access: { has: obj => "weight" in obj, get: obj => obj.weight, set: (obj, value) => { obj.weight = value; } }, metadata: _metadata }, _weight_initializers, _weight_extraInitializers);
            __esDecorate(null, null, _approved_decorators, { kind: "field", name: "approved", static: false, private: false, access: { has: obj => "approved" in obj, get: obj => obj.approved, set: (obj, value) => { obj.approved = value; } }, metadata: _metadata }, _approved_initializers, _approved_extraInitializers);
            __esDecorate(null, null, _kind_decorators, { kind: "field", name: "kind", static: false, private: false, access: { has: obj => "kind" in obj, get: obj => obj.kind, set: (obj, value) => { obj.kind = value; } }, metadata: _metadata }, _kind_initializers, _kind_extraInitializers);
            __esDecorate(null, null, _issues_decorators, { kind: "field", name: "issues", static: false, private: false, access: { has: obj => "issues" in obj, get: obj => obj.issues, set: (obj, value) => { obj.issues = value; } }, metadata: _metadata }, _issues_initializers, _issues_extraInitializers);
            __esDecorate(null, null, _tags_decorators, { kind: "field", name: "tags", static: false, private: false, access: { has: obj => "tags" in obj, get: obj => obj.tags, set: (obj, value) => { obj.tags = value; } }, metadata: _metadata }, _tags_initializers, _tags_extraInitializers);
            __esDecorate(null, null, _main_decorators, { kind: "field", name: "main", static: false, private: false, access: { has: obj => "main" in obj, get: obj => obj.main, set: (obj, value) => { obj.main = value; } }, metadata: _metadata }, _main_initializers, _main_extraInitializers);
            __esDecorate(null, null, _day_decorators, { kind: "field", name: "day", static: false, private: false, access: { has: obj => "day" in obj, get: obj => obj.day, set: (obj, value) => { obj.day = value; } }, metadata: _metadata }, _day_initializers, _day_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        summary = __runInitializers(this, _summary_initializers, void 0);
        score = (__runInitializers(this, _summary_extraInitializers), __runInitializers(this, _score_initializers, void 0));
        weight = (__runInitializers(this, _score_extraInitializers), __runInitializers(this, _weight_initializers, void 0));
        approved = (__runInitializers(this, _weight_extraInitializers), __runInitializers(this, _approved_initializers, void 0));
        kind = (__runInitializers(this, _approved_extraInitializers), __runInitializers(this, _kind_initializers, void 0));
        issues = (__runInitializers(this, _kind_extraInitializers), __runInitializers(this, _issues_initializers, void 0));
        tags = (__runInitializers(this, _issues_extraInitializers), __runInitializers(this, _tags_initializers, void 0));
        main = (__runInitializers(this, _tags_extraInitializers), __runInitializers(this, _main_initializers, void 0));
        day = (__runInitializers(this, _main_extraInitializers), __runInitializers(this, _day_initializers, void 0));
        constructor() {
            __runInitializers(this, _day_extraInitializers);
        }
    };
})();
/** Declared, never instantiated: only `tsc` looks at these. */
let Mistakes = (() => {
    let _static_shared_decorators;
    let _static_shared_initializers = [];
    let _static_shared_extraInitializers = [];
    let _count_decorators;
    let _count_initializers = [];
    let _count_extraInitializers = [];
    let _flag_decorators;
    let _flag_initializers = [];
    let _flag_extraInitializers = [];
    let _note_decorators;
    let _note_initializers = [];
    let _note_extraInitializers = [];
    let _name_decorators;
    let _name_initializers = [];
    let _name_extraInitializers = [];
    let _narrow_decorators;
    let _narrow_initializers = [];
    let _narrow_extraInitializers = [];
    let _wide_decorators;
    let _wide_initializers = [];
    let _wide_extraInitializers = [];
    let _loose_decorators;
    let _loose_initializers = [];
    let _loose_extraInitializers = [];
    let _single_decorators;
    let _single_initializers = [];
    let _single_extraInitializers = [];
    let _numbers_decorators;
    let _numbers_initializers = [];
    let _numbers_extraInitializers = [];
    let _other_decorators;
    let _other_initializers = [];
    let _other_extraInitializers = [];
    let _currency_decorators;
    let _currency_initializers = [];
    let _currency_extraInitializers = [];
    let _hidden_decorators;
    let _hidden_initializers = [];
    let _hidden_extraInitializers = [];
    return class Mistakes {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _count_decorators = [Text()];
            _flag_decorators = [Email()];
            _note_decorators = [Text()];
            _name_decorators = [Text({ optional: true })];
            _narrow_decorators = [OneOf({ values: ["file"] })];
            _wide_decorators = [OneOf({ values: ["file", "folder", "link"] })];
            _loose_decorators = [OneOf({ values: ["file", "folder"] })];
            _single_decorators = [ListOf(Issue)];
            _numbers_decorators = [ListOf(Text)];
            _other_decorators = [Nested(Issue)];
            _currency_decorators = [CurrencyCode({ default: 1 })];
            _hidden_decorators = [Text()];
            _static_shared_decorators = [Text()];
            __esDecorate(null, null, _static_shared_decorators, { kind: "field", name: "shared", static: true, private: false, access: { has: obj => "shared" in obj, get: obj => obj.shared, set: (obj, value) => { obj.shared = value; } }, metadata: _metadata }, _static_shared_initializers, _static_shared_extraInitializers);
            __esDecorate(null, null, _count_decorators, { kind: "field", name: "count", static: false, private: false, access: { has: obj => "count" in obj, get: obj => obj.count, set: (obj, value) => { obj.count = value; } }, metadata: _metadata }, _count_initializers, _count_extraInitializers);
            __esDecorate(null, null, _flag_decorators, { kind: "field", name: "flag", static: false, private: false, access: { has: obj => "flag" in obj, get: obj => obj.flag, set: (obj, value) => { obj.flag = value; } }, metadata: _metadata }, _flag_initializers, _flag_extraInitializers);
            __esDecorate(null, null, _note_decorators, { kind: "field", name: "note", static: false, private: false, access: { has: obj => "note" in obj, get: obj => obj.note, set: (obj, value) => { obj.note = value; } }, metadata: _metadata }, _note_initializers, _note_extraInitializers);
            __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: obj => "name" in obj, get: obj => obj.name, set: (obj, value) => { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
            __esDecorate(null, null, _narrow_decorators, { kind: "field", name: "narrow", static: false, private: false, access: { has: obj => "narrow" in obj, get: obj => obj.narrow, set: (obj, value) => { obj.narrow = value; } }, metadata: _metadata }, _narrow_initializers, _narrow_extraInitializers);
            __esDecorate(null, null, _wide_decorators, { kind: "field", name: "wide", static: false, private: false, access: { has: obj => "wide" in obj, get: obj => obj.wide, set: (obj, value) => { obj.wide = value; } }, metadata: _metadata }, _wide_initializers, _wide_extraInitializers);
            __esDecorate(null, null, _loose_decorators, { kind: "field", name: "loose", static: false, private: false, access: { has: obj => "loose" in obj, get: obj => obj.loose, set: (obj, value) => { obj.loose = value; } }, metadata: _metadata }, _loose_initializers, _loose_extraInitializers);
            __esDecorate(null, null, _single_decorators, { kind: "field", name: "single", static: false, private: false, access: { has: obj => "single" in obj, get: obj => obj.single, set: (obj, value) => { obj.single = value; } }, metadata: _metadata }, _single_initializers, _single_extraInitializers);
            __esDecorate(null, null, _numbers_decorators, { kind: "field", name: "numbers", static: false, private: false, access: { has: obj => "numbers" in obj, get: obj => obj.numbers, set: (obj, value) => { obj.numbers = value; } }, metadata: _metadata }, _numbers_initializers, _numbers_extraInitializers);
            __esDecorate(null, null, _other_decorators, { kind: "field", name: "other", static: false, private: false, access: { has: obj => "other" in obj, get: obj => obj.other, set: (obj, value) => { obj.other = value; } }, metadata: _metadata }, _other_initializers, _other_extraInitializers);
            __esDecorate(null, null, _currency_decorators, { kind: "field", name: "currency", static: false, private: false, access: { has: obj => "currency" in obj, get: obj => obj.currency, set: (obj, value) => { obj.currency = value; } }, metadata: _metadata }, _currency_initializers, _currency_extraInitializers);
            __esDecorate(null, null, _hidden_decorators, { kind: "field", name: "hidden", static: false, private: false, access: { has: obj => "hidden" in obj, get: obj => obj.hidden, set: (obj, value) => { obj.hidden = value; } }, metadata: _metadata }, _hidden_initializers, _hidden_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        // @ts-expect-error — @Text on a number
        count = __runInitializers(this, _count_initializers, void 0);
        // @ts-expect-error — @Email on a boolean
        flag = (__runInitializers(this, _count_extraInitializers), __runInitializers(this, _flag_initializers, void 0));
        // @ts-expect-error — optional field without `optional: true`
        note = (__runInitializers(this, _flag_extraInitializers), __runInitializers(this, _note_initializers, void 0));
        // @ts-expect-error — `optional: true` on a required field
        name = (__runInitializers(this, _note_extraInitializers), __runInitializers(this, _name_initializers, void 0));
        // @ts-expect-error — `values` misses "folder"
        narrow = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _narrow_initializers, void 0));
        // @ts-expect-error — `values` has "link", the field does not
        wide = (__runInitializers(this, _narrow_extraInitializers), __runInitializers(this, _wide_initializers, void 0));
        // @ts-expect-error — @OneOf on a plain string
        loose = (__runInitializers(this, _wide_extraInitializers), __runInitializers(this, _loose_initializers, void 0));
        // @ts-expect-error — list of Issue on a single Issue
        single = (__runInitializers(this, _loose_extraInitializers), __runInitializers(this, _single_initializers, void 0));
        // @ts-expect-error — list of text on a list of numbers
        numbers = (__runInitializers(this, _single_extraInitializers), __runInitializers(this, _numbers_initializers, void 0));
        // @ts-expect-error — nested DTO of another shape
        other = (__runInitializers(this, _numbers_extraInitializers), __runInitializers(this, _other_initializers, void 0));
        // @ts-expect-error — a default of the wrong type
        currency = (__runInitializers(this, _other_extraInitializers), __runInitializers(this, _currency_initializers, void 0));
        // @ts-expect-error — a TS-private field is not plain data
        hidden = (__runInitializers(this, _currency_extraInitializers), __runInitializers(this, _hidden_initializers, void 0));
        // @ts-expect-error — a static field is not data
        static shared = __runInitializers(this, _static_shared_initializers, void 0);
        constructor() {
            __runInitializers(this, _hidden_extraInitializers);
        }
        static {
            __runInitializers(this, _static_shared_extraInitializers);
        }
    };
})();
describe("DTO field decorators — compile-time checks (#118)", () => {
    it("AC5: the file above type-checks only because each mistake is a compile error", () => {
        expect(fieldsOf(Review).map((field) => field.name)).toEqual([
            "summary",
            "score",
            "weight",
            "approved",
            "kind",
            "issues",
            "tags",
            "main",
            "day",
        ]);
        expect(Mistakes.name).toBe("Mistakes");
    });
});
