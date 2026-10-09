var __esDecorate =
  (this && this.__esDecorate) ||
  function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) {
      if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
      return f;
    }
    var kind = contextIn.kind,
      key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? (contextIn["static"] ? ctor : ctor.prototype) : null;
    var descriptor =
      descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _,
      done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
      var context = {};
      for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
      for (var p in contextIn.access) context.access[p] = contextIn.access[p];
      context.addInitializer = function (f) {
        if (done) throw new TypeError("Cannot add initializers after decoration has completed");
        extraInitializers.push(accept(f || null));
      };
      var result = (0, decorators[i])(
        kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key],
        context,
      );
      if (kind === "accessor") {
        if (result === void 0) continue;
        if (result === null || typeof result !== "object") throw new TypeError("Object expected");
        if ((_ = accept(result.get))) descriptor.get = _;
        if ((_ = accept(result.set))) descriptor.set = _;
        if ((_ = accept(result.init))) initializers.unshift(_);
      } else if ((_ = accept(result))) {
        if (kind === "field") initializers.unshift(_);
        else descriptor[key] = _;
      }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
  };
var __runInitializers =
  (this && this.__runInitializers) ||
  function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
      value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
  };
/** #118 AC5: runtime validation — formats, lengths, ranges, list sizes; each issue with its path and reason. */
import { describe, expect, it } from "vitest";
import {
  CountryCode,
  CurrencyCode,
  Date,
  DateTime,
  Decimal,
  DecimalString,
  Duration,
  DtoValidationError,
  Email,
  Flag,
  Integer,
  ListOf,
  MediaType,
  Nested,
  OneOf,
  PhoneNumber,
  Text,
  TimeZone,
  Url,
  Uuid,
} from "../../src/dto/index.js";
import { validate } from "../../src/dto/schema.js";
let Everything = (() => {
  let _text_decorators;
  let _text_initializers = [];
  let _text_extraInitializers = [];
  let _code_decorators;
  let _code_initializers = [];
  let _code_extraInitializers = [];
  let _count_decorators;
  let _count_initializers = [];
  let _count_extraInitializers = [];
  let _score_decorators;
  let _score_initializers = [];
  let _score_extraInitializers = [];
  let _done_decorators;
  let _done_initializers = [];
  let _done_extraInitializers = [];
  let _email_decorators;
  let _email_initializers = [];
  let _email_extraInitializers = [];
  let _url_decorators;
  let _url_initializers = [];
  let _url_extraInitializers = [];
  let _id_decorators;
  let _id_initializers = [];
  let _id_extraInitializers = [];
  let _day_decorators;
  let _day_initializers = [];
  let _day_extraInitializers = [];
  let _at_decorators;
  let _at_initializers = [];
  let _at_extraInitializers = [];
  let _takes_decorators;
  let _takes_initializers = [];
  let _takes_extraInitializers = [];
  let _amount_decorators;
  let _amount_initializers = [];
  let _amount_extraInitializers = [];
  let _currency_decorators;
  let _currency_initializers = [];
  let _currency_extraInitializers = [];
  let _country_decorators;
  let _country_initializers = [];
  let _country_extraInitializers = [];
  let _phone_decorators;
  let _phone_initializers = [];
  let _phone_extraInitializers = [];
  let _type_decorators;
  let _type_initializers = [];
  let _type_extraInitializers = [];
  let _zone_decorators;
  let _zone_initializers = [];
  let _zone_extraInitializers = [];
  let _kind_decorators;
  let _kind_initializers = [];
  let _kind_extraInitializers = [];
  let _tags_decorators;
  let _tags_initializers = [];
  let _tags_extraInitializers = [];
  return class Everything {
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
      _text_decorators = [Text({ minLength: 2, maxLength: 5 })];
      _code_decorators = [Text({ pattern: /^[A-Z]{2}-\d{4}$/, optional: true })];
      _count_decorators = [Integer({ min: 1, max: 50 })];
      _score_decorators = [Decimal({ min: 0, max: 1 })];
      _done_decorators = [Flag()];
      _email_decorators = [Email()];
      _url_decorators = [Url()];
      _id_decorators = [Uuid()];
      _day_decorators = [Date()];
      _at_decorators = [DateTime()];
      _takes_decorators = [Duration()];
      _amount_decorators = [DecimalString({ scale: 2 })];
      _currency_decorators = [CurrencyCode()];
      _country_decorators = [CountryCode()];
      _phone_decorators = [PhoneNumber()];
      _type_decorators = [MediaType()];
      _zone_decorators = [TimeZone()];
      _kind_decorators = [OneOf({ values: ["file", "folder"] })];
      _tags_decorators = [ListOf(Text, { minItems: 1, maxItems: 2 })];
      __esDecorate(
        null,
        null,
        _text_decorators,
        {
          kind: "field",
          name: "text",
          static: false,
          private: false,
          access: {
            has: (obj) => "text" in obj,
            get: (obj) => obj.text,
            set: (obj, value) => {
              obj.text = value;
            },
          },
          metadata: _metadata,
        },
        _text_initializers,
        _text_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _code_decorators,
        {
          kind: "field",
          name: "code",
          static: false,
          private: false,
          access: {
            has: (obj) => "code" in obj,
            get: (obj) => obj.code,
            set: (obj, value) => {
              obj.code = value;
            },
          },
          metadata: _metadata,
        },
        _code_initializers,
        _code_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _count_decorators,
        {
          kind: "field",
          name: "count",
          static: false,
          private: false,
          access: {
            has: (obj) => "count" in obj,
            get: (obj) => obj.count,
            set: (obj, value) => {
              obj.count = value;
            },
          },
          metadata: _metadata,
        },
        _count_initializers,
        _count_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _score_decorators,
        {
          kind: "field",
          name: "score",
          static: false,
          private: false,
          access: {
            has: (obj) => "score" in obj,
            get: (obj) => obj.score,
            set: (obj, value) => {
              obj.score = value;
            },
          },
          metadata: _metadata,
        },
        _score_initializers,
        _score_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _done_decorators,
        {
          kind: "field",
          name: "done",
          static: false,
          private: false,
          access: {
            has: (obj) => "done" in obj,
            get: (obj) => obj.done,
            set: (obj, value) => {
              obj.done = value;
            },
          },
          metadata: _metadata,
        },
        _done_initializers,
        _done_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _email_decorators,
        {
          kind: "field",
          name: "email",
          static: false,
          private: false,
          access: {
            has: (obj) => "email" in obj,
            get: (obj) => obj.email,
            set: (obj, value) => {
              obj.email = value;
            },
          },
          metadata: _metadata,
        },
        _email_initializers,
        _email_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _url_decorators,
        {
          kind: "field",
          name: "url",
          static: false,
          private: false,
          access: {
            has: (obj) => "url" in obj,
            get: (obj) => obj.url,
            set: (obj, value) => {
              obj.url = value;
            },
          },
          metadata: _metadata,
        },
        _url_initializers,
        _url_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _id_decorators,
        {
          kind: "field",
          name: "id",
          static: false,
          private: false,
          access: {
            has: (obj) => "id" in obj,
            get: (obj) => obj.id,
            set: (obj, value) => {
              obj.id = value;
            },
          },
          metadata: _metadata,
        },
        _id_initializers,
        _id_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _day_decorators,
        {
          kind: "field",
          name: "day",
          static: false,
          private: false,
          access: {
            has: (obj) => "day" in obj,
            get: (obj) => obj.day,
            set: (obj, value) => {
              obj.day = value;
            },
          },
          metadata: _metadata,
        },
        _day_initializers,
        _day_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _at_decorators,
        {
          kind: "field",
          name: "at",
          static: false,
          private: false,
          access: {
            has: (obj) => "at" in obj,
            get: (obj) => obj.at,
            set: (obj, value) => {
              obj.at = value;
            },
          },
          metadata: _metadata,
        },
        _at_initializers,
        _at_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _takes_decorators,
        {
          kind: "field",
          name: "takes",
          static: false,
          private: false,
          access: {
            has: (obj) => "takes" in obj,
            get: (obj) => obj.takes,
            set: (obj, value) => {
              obj.takes = value;
            },
          },
          metadata: _metadata,
        },
        _takes_initializers,
        _takes_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _amount_decorators,
        {
          kind: "field",
          name: "amount",
          static: false,
          private: false,
          access: {
            has: (obj) => "amount" in obj,
            get: (obj) => obj.amount,
            set: (obj, value) => {
              obj.amount = value;
            },
          },
          metadata: _metadata,
        },
        _amount_initializers,
        _amount_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _currency_decorators,
        {
          kind: "field",
          name: "currency",
          static: false,
          private: false,
          access: {
            has: (obj) => "currency" in obj,
            get: (obj) => obj.currency,
            set: (obj, value) => {
              obj.currency = value;
            },
          },
          metadata: _metadata,
        },
        _currency_initializers,
        _currency_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _country_decorators,
        {
          kind: "field",
          name: "country",
          static: false,
          private: false,
          access: {
            has: (obj) => "country" in obj,
            get: (obj) => obj.country,
            set: (obj, value) => {
              obj.country = value;
            },
          },
          metadata: _metadata,
        },
        _country_initializers,
        _country_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _phone_decorators,
        {
          kind: "field",
          name: "phone",
          static: false,
          private: false,
          access: {
            has: (obj) => "phone" in obj,
            get: (obj) => obj.phone,
            set: (obj, value) => {
              obj.phone = value;
            },
          },
          metadata: _metadata,
        },
        _phone_initializers,
        _phone_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _type_decorators,
        {
          kind: "field",
          name: "type",
          static: false,
          private: false,
          access: {
            has: (obj) => "type" in obj,
            get: (obj) => obj.type,
            set: (obj, value) => {
              obj.type = value;
            },
          },
          metadata: _metadata,
        },
        _type_initializers,
        _type_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _zone_decorators,
        {
          kind: "field",
          name: "zone",
          static: false,
          private: false,
          access: {
            has: (obj) => "zone" in obj,
            get: (obj) => obj.zone,
            set: (obj, value) => {
              obj.zone = value;
            },
          },
          metadata: _metadata,
        },
        _zone_initializers,
        _zone_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _kind_decorators,
        {
          kind: "field",
          name: "kind",
          static: false,
          private: false,
          access: {
            has: (obj) => "kind" in obj,
            get: (obj) => obj.kind,
            set: (obj, value) => {
              obj.kind = value;
            },
          },
          metadata: _metadata,
        },
        _kind_initializers,
        _kind_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _tags_decorators,
        {
          kind: "field",
          name: "tags",
          static: false,
          private: false,
          access: {
            has: (obj) => "tags" in obj,
            get: (obj) => obj.tags,
            set: (obj, value) => {
              obj.tags = value;
            },
          },
          metadata: _metadata,
        },
        _tags_initializers,
        _tags_extraInitializers,
      );
      if (_metadata)
        Object.defineProperty(this, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
    }
    text = __runInitializers(this, _text_initializers, void 0);
    code =
      (__runInitializers(this, _text_extraInitializers),
      __runInitializers(this, _code_initializers, void 0));
    count =
      (__runInitializers(this, _code_extraInitializers),
      __runInitializers(this, _count_initializers, void 0));
    score =
      (__runInitializers(this, _count_extraInitializers),
      __runInitializers(this, _score_initializers, void 0));
    done =
      (__runInitializers(this, _score_extraInitializers),
      __runInitializers(this, _done_initializers, void 0));
    email =
      (__runInitializers(this, _done_extraInitializers),
      __runInitializers(this, _email_initializers, void 0));
    url =
      (__runInitializers(this, _email_extraInitializers),
      __runInitializers(this, _url_initializers, void 0));
    id =
      (__runInitializers(this, _url_extraInitializers),
      __runInitializers(this, _id_initializers, void 0));
    day =
      (__runInitializers(this, _id_extraInitializers),
      __runInitializers(this, _day_initializers, void 0));
    at =
      (__runInitializers(this, _day_extraInitializers),
      __runInitializers(this, _at_initializers, void 0));
    takes =
      (__runInitializers(this, _at_extraInitializers),
      __runInitializers(this, _takes_initializers, void 0));
    amount =
      (__runInitializers(this, _takes_extraInitializers),
      __runInitializers(this, _amount_initializers, void 0));
    currency =
      (__runInitializers(this, _amount_extraInitializers),
      __runInitializers(this, _currency_initializers, void 0));
    country =
      (__runInitializers(this, _currency_extraInitializers),
      __runInitializers(this, _country_initializers, void 0));
    phone =
      (__runInitializers(this, _country_extraInitializers),
      __runInitializers(this, _phone_initializers, void 0));
    type =
      (__runInitializers(this, _phone_extraInitializers),
      __runInitializers(this, _type_initializers, void 0));
    zone =
      (__runInitializers(this, _type_extraInitializers),
      __runInitializers(this, _zone_initializers, void 0));
    kind =
      (__runInitializers(this, _zone_extraInitializers),
      __runInitializers(this, _kind_initializers, void 0));
    tags =
      (__runInitializers(this, _kind_extraInitializers),
      __runInitializers(this, _tags_initializers, void 0));
    constructor() {
      __runInitializers(this, _tags_extraInitializers);
    }
  };
})();
const valid = {
  text: "abc",
  count: 3,
  score: 0.5,
  done: true,
  email: "a@b.io",
  url: "https://example.com/x",
  id: "3b241101-e2bb-4255-8caf-4136c566a962",
  day: "2026-10-01",
  at: "2026-10-01T09:00:00Z",
  takes: "PT30M",
  amount: "19.99",
  currency: "USD",
  country: "IL",
  phone: "+972521234567",
  type: "application/pdf",
  zone: "Asia/Jerusalem",
  kind: "file",
  tags: ["x"],
};
/** The issue paths a value gets; [] = valid. */
function pathsOf(raw) {
  try {
    validate(Everything, raw);
    return [];
  } catch (error) {
    if (!(error instanceof DtoValidationError)) throw error;
    return error.issues.map((issue) => issue.path);
  }
}
const reasonOf = (raw) => {
  try {
    validate(Everything, raw);
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : "";
  }
};
describe("DTO validation (#118)", () => {
  it("AC5: each decorator accepts a valid value", () => {
    expect(validate(Everything, valid)).toEqual(valid);
    expect(pathsOf({ ...valid, code: "IL-0042", zone: "UTC" })).toEqual([]);
  });
  it.each([
    ["text", "a"],
    ["text", "abcdef"],
    ["code", "il-42"],
    ["count", 2.5],
    ["count", 0],
    ["count", 51],
    ["score", 1.5],
    ["score", Infinity],
    ["done", "yes"],
    ["email", "not-an-email"],
    ["url", "nowhere"],
    ["id", "123"],
    ["day", "2026-13-01"],
    ["at", "tomorrow"],
    ["takes", "30 minutes"],
    ["amount", "19.999"],
    ["amount", "19,99"],
    ["currency", "usd"],
    ["currency", "ABC"],
    ["country", "XX"],
    ["phone", "0521234567"],
    ["type", "pdf"],
    ["zone", "Mars/Olympus"],
    ["kind", "link"],
    ["tags", []],
    ["tags", ["a", "b", "c"]],
  ])("AC5: rejects %s = %j with the field's path", (field, value) => {
    expect(pathsOf({ ...valid, [field]: value })).toEqual([field]);
  });
  it("AC5: a date-time without an offset → dto.date-time-without-offset; with Z or an offset it passes", () => {
    expect(reasonOf({ ...valid, at: "2026-10-01T09:00" })).toMatch(
      /at: dto\.date-time-without-offset/,
    );
    expect(pathsOf({ ...valid, at: "2026-10-01T09:00:00+03:00" })).toEqual([]);
    expect(pathsOf({ ...valid, at: "2026-10-01T09:00:00Z" })).toEqual([]);
  });
  it("AC5: a missing required field and a wrong type are reported by path", () => {
    expect(pathsOf({ ...valid, text: undefined })).toEqual(["text"]);
    expect(pathsOf("not an object")).toEqual(["(root)"]);
  });
  it("AC5: a nested list of DTOs validates each element with an indexed path", () => {
    let Job = (() => {
      let _url_decorators;
      let _url_initializers = [];
      let _url_extraInitializers = [];
      return class Job {
        static {
          const _metadata =
            typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
          _url_decorators = [Url()];
          __esDecorate(
            null,
            null,
            _url_decorators,
            {
              kind: "field",
              name: "url",
              static: false,
              private: false,
              access: {
                has: (obj) => "url" in obj,
                get: (obj) => obj.url,
                set: (obj, value) => {
                  obj.url = value;
                },
              },
              metadata: _metadata,
            },
            _url_initializers,
            _url_extraInitializers,
          );
          if (_metadata)
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: true,
              configurable: true,
              writable: true,
              value: _metadata,
            });
        }
        url = __runInitializers(this, _url_initializers, void 0);
        constructor() {
          __runInitializers(this, _url_extraInitializers);
        }
      };
    })();
    let Jobs = (() => {
      let _jobs_decorators;
      let _jobs_initializers = [];
      let _jobs_extraInitializers = [];
      let _best_decorators;
      let _best_initializers = [];
      let _best_extraInitializers = [];
      return class Jobs {
        static {
          const _metadata =
            typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
          _jobs_decorators = [ListOf(Job)];
          _best_decorators = [Nested(Job, { optional: true })];
          __esDecorate(
            null,
            null,
            _jobs_decorators,
            {
              kind: "field",
              name: "jobs",
              static: false,
              private: false,
              access: {
                has: (obj) => "jobs" in obj,
                get: (obj) => obj.jobs,
                set: (obj, value) => {
                  obj.jobs = value;
                },
              },
              metadata: _metadata,
            },
            _jobs_initializers,
            _jobs_extraInitializers,
          );
          __esDecorate(
            null,
            null,
            _best_decorators,
            {
              kind: "field",
              name: "best",
              static: false,
              private: false,
              access: {
                has: (obj) => "best" in obj,
                get: (obj) => obj.best,
                set: (obj, value) => {
                  obj.best = value;
                },
              },
              metadata: _metadata,
            },
            _best_initializers,
            _best_extraInitializers,
          );
          if (_metadata)
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: true,
              configurable: true,
              writable: true,
              value: _metadata,
            });
        }
        jobs = __runInitializers(this, _jobs_initializers, void 0);
        best =
          (__runInitializers(this, _jobs_extraInitializers),
          __runInitializers(this, _best_initializers, void 0));
        constructor() {
          __runInitializers(this, _best_extraInitializers);
        }
      };
    })();
    const jobs = [{ url: "https://a.io" }, { url: "https://b.io" }, { url: "nope" }];
    expect(() => validate(Jobs, { jobs, best: { url: "x" } })).toThrow(
      /jobs\[2\]\.url: .*; best\.url: /,
    );
  });
  it("AC5: a decimal string without a scale takes any number of digits after the point", () => {
    let Price = (() => {
      let _amount_decorators;
      let _amount_initializers = [];
      let _amount_extraInitializers = [];
      return class Price {
        static {
          const _metadata =
            typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
          _amount_decorators = [DecimalString()];
          __esDecorate(
            null,
            null,
            _amount_decorators,
            {
              kind: "field",
              name: "amount",
              static: false,
              private: false,
              access: {
                has: (obj) => "amount" in obj,
                get: (obj) => obj.amount,
                set: (obj, value) => {
                  obj.amount = value;
                },
              },
              metadata: _metadata,
            },
            _amount_initializers,
            _amount_extraInitializers,
          );
          if (_metadata)
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: true,
              configurable: true,
              writable: true,
              value: _metadata,
            });
        }
        amount = __runInitializers(this, _amount_initializers, void 0);
        constructor() {
          __runInitializers(this, _amount_extraInitializers);
        }
      };
    })();
    expect(validate(Price, { amount: "-19.999" })).toEqual({ amount: "-19.999" });
    expect(() => validate(Price, { amount: "19." })).toThrow(/amount: not a decimal number/);
  });
  it("AC5: a default fills a missing field; an optional field may be left out", () => {
    let Query = (() => {
      let _count_decorators;
      let _count_initializers = [];
      let _count_extraInitializers = [];
      let _note_decorators;
      let _note_initializers = [];
      let _note_extraInitializers = [];
      return class Query {
        static {
          const _metadata =
            typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
          _count_decorators = [Integer({ default: 20 })];
          _note_decorators = [Text({ optional: true })];
          __esDecorate(
            null,
            null,
            _count_decorators,
            {
              kind: "field",
              name: "count",
              static: false,
              private: false,
              access: {
                has: (obj) => "count" in obj,
                get: (obj) => obj.count,
                set: (obj, value) => {
                  obj.count = value;
                },
              },
              metadata: _metadata,
            },
            _count_initializers,
            _count_extraInitializers,
          );
          __esDecorate(
            null,
            null,
            _note_decorators,
            {
              kind: "field",
              name: "note",
              static: false,
              private: false,
              access: {
                has: (obj) => "note" in obj,
                get: (obj) => obj.note,
                set: (obj, value) => {
                  obj.note = value;
                },
              },
              metadata: _metadata,
            },
            _note_initializers,
            _note_extraInitializers,
          );
          if (_metadata)
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: true,
              configurable: true,
              writable: true,
              value: _metadata,
            });
        }
        count = __runInitializers(this, _count_initializers, void 0);
        note =
          (__runInitializers(this, _count_extraInitializers),
          __runInitializers(this, _note_initializers, void 0));
        constructor() {
          __runInitializers(this, _note_extraInitializers);
        }
      };
    })();
    expect(validate(Query, {})).toEqual({ count: 20 });
  });
});
