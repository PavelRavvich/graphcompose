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
import {
  CountryCode,
  CurrencyCode,
  Date as CalendarDate,
  DateTime,
  DecimalString,
  Email,
  MediaType,
  PhoneNumber,
  Text,
  TimeZone,
  Url,
} from "../decorators.js";
import { crossFieldRule } from "../schema.js";
/** An amount of money: exact, as a decimal string, with its currency. */
let Money = (() => {
  let _amount_decorators;
  let _amount_initializers = [];
  let _amount_extraInitializers = [];
  let _currency_decorators;
  let _currency_initializers = [];
  let _currency_extraInitializers = [];
  return class Money {
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
      _amount_decorators = [DecimalString({ prompt: "the amount, e.g. 19.99", scale: 2 })];
      _currency_decorators = [CurrencyCode({ prompt: "the currency, ISO 4217, e.g. USD" })];
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
      if (_metadata)
        Object.defineProperty(this, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
    }
    amount = __runInitializers(this, _amount_initializers, void 0);
    currency =
      (__runInitializers(this, _amount_extraInitializers),
      __runInitializers(this, _currency_initializers, void 0));
    constructor() {
      __runInitializers(this, _currency_extraInitializers);
    }
  };
})();
export { Money };
/** Calendar days, both ends included; no time of day. */
let DateRange = (() => {
  let _from_decorators;
  let _from_initializers = [];
  let _from_extraInitializers = [];
  let _to_decorators;
  let _to_initializers = [];
  let _to_extraInitializers = [];
  let _timeZone_decorators;
  let _timeZone_initializers = [];
  let _timeZone_extraInitializers = [];
  return class DateRange {
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
      _from_decorators = [CalendarDate({ prompt: "the first day, e.g. 2026-09-01" })];
      _to_decorators = [CalendarDate({ prompt: "the last day, e.g. 2026-09-30" })];
      _timeZone_decorators = [
        TimeZone({
          prompt: "the time zone these days are in, IANA, e.g. Asia/Jerusalem",
          optional: true,
        }),
      ];
      __esDecorate(
        null,
        null,
        _from_decorators,
        {
          kind: "field",
          name: "from",
          static: false,
          private: false,
          access: {
            has: (obj) => "from" in obj,
            get: (obj) => obj.from,
            set: (obj, value) => {
              obj.from = value;
            },
          },
          metadata: _metadata,
        },
        _from_initializers,
        _from_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _to_decorators,
        {
          kind: "field",
          name: "to",
          static: false,
          private: false,
          access: {
            has: (obj) => "to" in obj,
            get: (obj) => obj.to,
            set: (obj, value) => {
              obj.to = value;
            },
          },
          metadata: _metadata,
        },
        _to_initializers,
        _to_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _timeZone_decorators,
        {
          kind: "field",
          name: "timeZone",
          static: false,
          private: false,
          access: {
            has: (obj) => "timeZone" in obj,
            get: (obj) => obj.timeZone,
            set: (obj, value) => {
              obj.timeZone = value;
            },
          },
          metadata: _metadata,
        },
        _timeZone_initializers,
        _timeZone_extraInitializers,
      );
      if (_metadata)
        Object.defineProperty(this, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
    }
    from = __runInitializers(this, _from_initializers, void 0);
    to =
      (__runInitializers(this, _from_extraInitializers),
      __runInitializers(this, _to_initializers, void 0));
    timeZone =
      (__runInitializers(this, _to_extraInitializers),
      __runInitializers(this, _timeZone_initializers, void 0));
    constructor() {
      __runInitializers(this, _timeZone_extraInitializers);
    }
  };
})();
export { DateRange };
crossFieldRule(DateRange, ({ from, to }) =>
  from <= to ? undefined : { field: "to", reason: "the last day is before the first" },
);
/** Exact moments: from included, to excluded. */
let DateTimeRange = (() => {
  let _from_decorators;
  let _from_initializers = [];
  let _from_extraInitializers = [];
  let _to_decorators;
  let _to_initializers = [];
  let _to_extraInitializers = [];
  return class DateTimeRange {
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
      _from_decorators = [
        DateTime({ prompt: "start, with a UTC offset, e.g. 2026-09-01T09:00:00+03:00" }),
      ];
      _to_decorators = [
        DateTime({ prompt: "end, with a UTC offset, e.g. 2026-09-01T18:00:00+03:00" }),
      ];
      __esDecorate(
        null,
        null,
        _from_decorators,
        {
          kind: "field",
          name: "from",
          static: false,
          private: false,
          access: {
            has: (obj) => "from" in obj,
            get: (obj) => obj.from,
            set: (obj, value) => {
              obj.from = value;
            },
          },
          metadata: _metadata,
        },
        _from_initializers,
        _from_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _to_decorators,
        {
          kind: "field",
          name: "to",
          static: false,
          private: false,
          access: {
            has: (obj) => "to" in obj,
            get: (obj) => obj.to,
            set: (obj, value) => {
              obj.to = value;
            },
          },
          metadata: _metadata,
        },
        _to_initializers,
        _to_extraInitializers,
      );
      if (_metadata)
        Object.defineProperty(this, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
    }
    from = __runInitializers(this, _from_initializers, void 0);
    to =
      (__runInitializers(this, _from_extraInitializers),
      __runInitializers(this, _to_initializers, void 0));
    constructor() {
      __runInitializers(this, _to_extraInitializers);
    }
  };
})();
export { DateTimeRange };
crossFieldRule(DateTimeRange, ({ from, to }) =>
  Date.parse(from) < Date.parse(to)
    ? undefined
    : { field: "to", reason: "the end is not after the start" },
);
/** A file attached to a message or an replyWith — by link or by content. */
let Attachment = (() => {
  let _name_decorators;
  let _name_initializers = [];
  let _name_extraInitializers = [];
  let _mediaType_decorators;
  let _mediaType_initializers = [];
  let _mediaType_extraInitializers = [];
  let _url_decorators;
  let _url_initializers = [];
  let _url_extraInitializers = [];
  let _content_decorators;
  let _content_initializers = [];
  let _content_extraInitializers = [];
  return class Attachment {
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
      _name_decorators = [Text({ prompt: "the file name, e.g. invoice.pdf" })];
      _mediaType_decorators = [MediaType({ prompt: "the file type, e.g. application/pdf" })];
      _url_decorators = [Url({ prompt: "where to download it", optional: true })];
      _content_decorators = [
        Text({ prompt: "the content, base64-encoded, when there is no link", optional: true }),
      ];
      __esDecorate(
        null,
        null,
        _name_decorators,
        {
          kind: "field",
          name: "name",
          static: false,
          private: false,
          access: {
            has: (obj) => "name" in obj,
            get: (obj) => obj.name,
            set: (obj, value) => {
              obj.name = value;
            },
          },
          metadata: _metadata,
        },
        _name_initializers,
        _name_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _mediaType_decorators,
        {
          kind: "field",
          name: "mediaType",
          static: false,
          private: false,
          access: {
            has: (obj) => "mediaType" in obj,
            get: (obj) => obj.mediaType,
            set: (obj, value) => {
              obj.mediaType = value;
            },
          },
          metadata: _metadata,
        },
        _mediaType_initializers,
        _mediaType_extraInitializers,
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
        _content_decorators,
        {
          kind: "field",
          name: "content",
          static: false,
          private: false,
          access: {
            has: (obj) => "content" in obj,
            get: (obj) => obj.content,
            set: (obj, value) => {
              obj.content = value;
            },
          },
          metadata: _metadata,
        },
        _content_initializers,
        _content_extraInitializers,
      );
      if (_metadata)
        Object.defineProperty(this, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
    }
    name = __runInitializers(this, _name_initializers, void 0);
    mediaType =
      (__runInitializers(this, _name_extraInitializers),
      __runInitializers(this, _mediaType_initializers, void 0));
    url =
      (__runInitializers(this, _mediaType_extraInitializers),
      __runInitializers(this, _url_initializers, void 0));
    content =
      (__runInitializers(this, _url_extraInitializers),
      __runInitializers(this, _content_initializers, void 0));
    constructor() {
      __runInitializers(this, _content_extraInitializers);
    }
  };
})();
export { Attachment };
crossFieldRule(Attachment, ({ url, content }) =>
  (url === undefined) !== (content === undefined)
    ? undefined
    : { field: "url", reason: "give exactly one of url and content" },
);
/** A postal address. */
let Address = (() => {
  let _street_decorators;
  let _street_initializers = [];
  let _street_extraInitializers = [];
  let _city_decorators;
  let _city_initializers = [];
  let _city_extraInitializers = [];
  let _region_decorators;
  let _region_initializers = [];
  let _region_extraInitializers = [];
  let _postalCode_decorators;
  let _postalCode_initializers = [];
  let _postalCode_extraInitializers = [];
  let _country_decorators;
  let _country_initializers = [];
  let _country_extraInitializers = [];
  return class Address {
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
      _street_decorators = [Text({ prompt: "street and house number" })];
      _city_decorators = [Text({ prompt: "city" })];
      _region_decorators = [
        Text({ prompt: "region or state, if the country uses them", optional: true }),
      ];
      _postalCode_decorators = [Text({ prompt: "postal code", optional: true })];
      _country_decorators = [CountryCode({ prompt: "country, ISO 3166-1 alpha-2, e.g. IL" })];
      __esDecorate(
        null,
        null,
        _street_decorators,
        {
          kind: "field",
          name: "street",
          static: false,
          private: false,
          access: {
            has: (obj) => "street" in obj,
            get: (obj) => obj.street,
            set: (obj, value) => {
              obj.street = value;
            },
          },
          metadata: _metadata,
        },
        _street_initializers,
        _street_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _city_decorators,
        {
          kind: "field",
          name: "city",
          static: false,
          private: false,
          access: {
            has: (obj) => "city" in obj,
            get: (obj) => obj.city,
            set: (obj, value) => {
              obj.city = value;
            },
          },
          metadata: _metadata,
        },
        _city_initializers,
        _city_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _region_decorators,
        {
          kind: "field",
          name: "region",
          static: false,
          private: false,
          access: {
            has: (obj) => "region" in obj,
            get: (obj) => obj.region,
            set: (obj, value) => {
              obj.region = value;
            },
          },
          metadata: _metadata,
        },
        _region_initializers,
        _region_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _postalCode_decorators,
        {
          kind: "field",
          name: "postalCode",
          static: false,
          private: false,
          access: {
            has: (obj) => "postalCode" in obj,
            get: (obj) => obj.postalCode,
            set: (obj, value) => {
              obj.postalCode = value;
            },
          },
          metadata: _metadata,
        },
        _postalCode_initializers,
        _postalCode_extraInitializers,
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
      if (_metadata)
        Object.defineProperty(this, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
    }
    street = __runInitializers(this, _street_initializers, void 0);
    city =
      (__runInitializers(this, _street_extraInitializers),
      __runInitializers(this, _city_initializers, void 0));
    region =
      (__runInitializers(this, _city_extraInitializers),
      __runInitializers(this, _region_initializers, void 0));
    postalCode =
      (__runInitializers(this, _region_extraInitializers),
      __runInitializers(this, _postalCode_initializers, void 0));
    country =
      (__runInitializers(this, _postalCode_extraInitializers),
      __runInitializers(this, _country_initializers, void 0));
    constructor() {
      __runInitializers(this, _country_extraInitializers);
    }
  };
})();
export { Address };
/** A person's name. */
let PersonName = (() => {
  let _given_decorators;
  let _given_initializers = [];
  let _given_extraInitializers = [];
  let _family_decorators;
  let _family_initializers = [];
  let _family_extraInitializers = [];
  return class PersonName {
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
      _given_decorators = [Text({ prompt: "given name" })];
      _family_decorators = [Text({ prompt: "family name", optional: true })];
      __esDecorate(
        null,
        null,
        _given_decorators,
        {
          kind: "field",
          name: "given",
          static: false,
          private: false,
          access: {
            has: (obj) => "given" in obj,
            get: (obj) => obj.given,
            set: (obj, value) => {
              obj.given = value;
            },
          },
          metadata: _metadata,
        },
        _given_initializers,
        _given_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _family_decorators,
        {
          kind: "field",
          name: "family",
          static: false,
          private: false,
          access: {
            has: (obj) => "family" in obj,
            get: (obj) => obj.family,
            set: (obj, value) => {
              obj.family = value;
            },
          },
          metadata: _metadata,
        },
        _family_initializers,
        _family_extraInitializers,
      );
      if (_metadata)
        Object.defineProperty(this, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
    }
    given = __runInitializers(this, _given_initializers, void 0);
    family =
      (__runInitializers(this, _given_extraInitializers),
      __runInitializers(this, _family_initializers, void 0));
    constructor() {
      __runInitializers(this, _family_extraInitializers);
    }
  };
})();
export { PersonName };
/** How to reach a person. */
let ContactInfo = (() => {
  let _email_decorators;
  let _email_initializers = [];
  let _email_extraInitializers = [];
  let _phone_decorators;
  let _phone_initializers = [];
  let _phone_extraInitializers = [];
  return class ContactInfo {
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
      _email_decorators = [Email({ prompt: "email address", optional: true })];
      _phone_decorators = [
        PhoneNumber({
          prompt: "phone number in international format, e.g. +972521234567",
          optional: true,
        }),
      ];
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
      if (_metadata)
        Object.defineProperty(this, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
    }
    email = __runInitializers(this, _email_initializers, void 0);
    phone =
      (__runInitializers(this, _email_extraInitializers),
      __runInitializers(this, _phone_initializers, void 0));
    constructor() {
      __runInitializers(this, _phone_extraInitializers);
    }
  };
})();
export { ContactInfo };
crossFieldRule(ContactInfo, ({ email, phone }) =>
  email !== undefined || phone !== undefined
    ? undefined
    : { field: "email", reason: "give an email, a phone or both" },
);
/** Where a statement in an replyWith comes from, in a knowledge base. */
let RagSourceReference = (() => {
  let _title_decorators;
  let _title_initializers = [];
  let _title_extraInitializers = [];
  let _url_decorators;
  let _url_initializers = [];
  let _url_extraInitializers = [];
  let _quote_decorators;
  let _quote_initializers = [];
  let _quote_extraInitializers = [];
  return class RagSourceReference {
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
      _title_decorators = [Text({ prompt: "what the source is: a document title, a page name" })];
      _url_decorators = [Url({ prompt: "a link to the source", optional: true })];
      _quote_decorators = [
        Text({ prompt: "the exact words the replyWith relies on", optional: true, maxLength: 300 }),
      ];
      __esDecorate(
        null,
        null,
        _title_decorators,
        {
          kind: "field",
          name: "title",
          static: false,
          private: false,
          access: {
            has: (obj) => "title" in obj,
            get: (obj) => obj.title,
            set: (obj, value) => {
              obj.title = value;
            },
          },
          metadata: _metadata,
        },
        _title_initializers,
        _title_extraInitializers,
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
        _quote_decorators,
        {
          kind: "field",
          name: "quote",
          static: false,
          private: false,
          access: {
            has: (obj) => "quote" in obj,
            get: (obj) => obj.quote,
            set: (obj, value) => {
              obj.quote = value;
            },
          },
          metadata: _metadata,
        },
        _quote_initializers,
        _quote_extraInitializers,
      );
      if (_metadata)
        Object.defineProperty(this, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
    }
    title = __runInitializers(this, _title_initializers, void 0);
    url =
      (__runInitializers(this, _title_extraInitializers),
      __runInitializers(this, _url_initializers, void 0));
    quote =
      (__runInitializers(this, _url_extraInitializers),
      __runInitializers(this, _quote_initializers, void 0));
    constructor() {
      __runInitializers(this, _quote_extraInitializers);
    }
  };
})();
export { RagSourceReference };
