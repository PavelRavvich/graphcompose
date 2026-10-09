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
/** #118 AC5: the startup check of a DTO class — every field decorated, plain data only. */
import { describe, expect, it } from "vitest";
import { DtoError, Text } from "../../src/dto/index.js";
import { recordField, registerDto } from "../../src/dto/metadata.js";
import { schemaOf } from "../../src/dto/schema.js";
const codeOf = (work) => {
  try {
    work();
    return "";
  } catch (error) {
    return error instanceof DtoError ? error.code : String(error);
  }
};
describe("DTO registration (#118)", () => {
  it("AC5: a field without a decorator → dto.undecorated-field, naming it", () => {
    let Partly = (() => {
      let _path_decorators;
      let _path_initializers = [];
      let _path_extraInitializers = [];
      return class Partly {
        static {
          const _metadata =
            typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
          _path_decorators = [Text()];
          __esDecorate(
            null,
            null,
            _path_decorators,
            {
              kind: "field",
              name: "path",
              static: false,
              private: false,
              access: {
                has: (obj) => "path" in obj,
                get: (obj) => obj.path,
                set: (obj, value) => {
                  obj.path = value;
                },
              },
              metadata: _metadata,
            },
            _path_initializers,
            _path_extraInitializers,
          );
          if (_metadata)
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: true,
              configurable: true,
              writable: true,
              value: _metadata,
            });
        }
        path = __runInitializers(this, _path_initializers, void 0);
        mode = __runInitializers(this, _path_extraInitializers);
      };
    })();
    expect(codeOf(() => schemaOf(Partly))).toBe("dto.undecorated-field");
    expect(() => schemaOf(Partly)).toThrow(/Partly: .* mode/);
  });
  it("AC5: a TS-private field is a field without a decorator at runtime", () => {
    let Hidden = (() => {
      let _path_decorators;
      let _path_initializers = [];
      let _path_extraInitializers = [];
      return class Hidden {
        static {
          const _metadata =
            typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
          _path_decorators = [Text()];
          __esDecorate(
            null,
            null,
            _path_decorators,
            {
              kind: "field",
              name: "path",
              static: false,
              private: false,
              access: {
                has: (obj) => "path" in obj,
                get: (obj) => obj.path,
                set: (obj, value) => {
                  obj.path = value;
                },
              },
              metadata: _metadata,
            },
            _path_initializers,
            _path_extraInitializers,
          );
          if (_metadata)
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: true,
              configurable: true,
              writable: true,
              value: _metadata,
            });
        }
        path = __runInitializers(this, _path_initializers, void 0);
        secret = (__runInitializers(this, _path_extraInitializers), "x");
        reveal() {
          return this.secret;
        }
      };
    })();
    expect(codeOf(() => registerDto(Hidden))).toBe("dto.undecorated-field");
  });
  it("AC5: a method or an accessor → dto.not-plain-data", () => {
    let WithMethod = (() => {
      let _path_decorators;
      let _path_initializers = [];
      let _path_extraInitializers = [];
      return class WithMethod {
        static {
          const _metadata =
            typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
          _path_decorators = [Text()];
          __esDecorate(
            null,
            null,
            _path_decorators,
            {
              kind: "field",
              name: "path",
              static: false,
              private: false,
              access: {
                has: (obj) => "path" in obj,
                get: (obj) => obj.path,
                set: (obj, value) => {
                  obj.path = value;
                },
              },
              metadata: _metadata,
            },
            _path_initializers,
            _path_extraInitializers,
          );
          if (_metadata)
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: true,
              configurable: true,
              writable: true,
              value: _metadata,
            });
        }
        path = __runInitializers(this, _path_initializers, void 0);
        describe() {
          return this.path;
        }
        constructor() {
          __runInitializers(this, _path_extraInitializers);
        }
      };
    })();
    let WithGetter = (() => {
      let _path_decorators;
      let _path_initializers = [];
      let _path_extraInitializers = [];
      return class WithGetter {
        static {
          const _metadata =
            typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
          _path_decorators = [Text()];
          __esDecorate(
            null,
            null,
            _path_decorators,
            {
              kind: "field",
              name: "path",
              static: false,
              private: false,
              access: {
                has: (obj) => "path" in obj,
                get: (obj) => obj.path,
                set: (obj, value) => {
                  obj.path = value;
                },
              },
              metadata: _metadata,
            },
            _path_initializers,
            _path_extraInitializers,
          );
          if (_metadata)
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: true,
              configurable: true,
              writable: true,
              value: _metadata,
            });
        }
        path = __runInitializers(this, _path_initializers, void 0);
        get upper() {
          return this.path.toUpperCase();
        }
        constructor() {
          __runInitializers(this, _path_extraInitializers);
        }
      };
    })();
    expect(codeOf(() => registerDto(WithMethod))).toBe("dto.not-plain-data");
    expect(() => registerDto(WithGetter)).toThrow(/WithGetter: .* upper/);
  });
  it("AC5: a decorated #private field → dto.not-plain-data (and a compile error)", () => {
    let Sealed = (() => {
      let _private_path_decorators;
      let _private_path_initializers = [];
      let _private_path_extraInitializers = [];
      let _name_decorators;
      let _name_initializers = [];
      let _name_extraInitializers = [];
      return class Sealed {
        static {
          const _metadata =
            typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
          _private_path_decorators = [Text()];
          _name_decorators = [Text()];
          __esDecorate(
            null,
            null,
            _private_path_decorators,
            {
              kind: "field",
              name: "#path",
              static: false,
              private: true,
              access: {
                has: (obj) => #path in obj,
                get: (obj) => obj.#path,
                set: (obj, value) => {
                  obj.#path = value;
                },
              },
              metadata: _metadata,
            },
            _private_path_initializers,
            _private_path_extraInitializers,
          );
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
          if (_metadata)
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: true,
              configurable: true,
              writable: true,
              value: _metadata,
            });
        }
        // @ts-expect-error — a #private field is not plain data
        #path = __runInitializers(this, _private_path_initializers, void 0);
        name =
          (__runInitializers(this, _private_path_extraInitializers),
          __runInitializers(this, _name_initializers, void 0));
        static pathOf(sealed) {
          return sealed.#path;
        }
        constructor() {
          __runInitializers(this, _name_extraInitializers);
        }
      };
    })();
    expect(codeOf(() => registerDto(Sealed))).toBe("dto.not-plain-data");
  });
  it("AC5: a subclass keeps its parent's fields first; a valid DTO registers once", () => {
    let Base = (() => {
      let _id_decorators;
      let _id_initializers = [];
      let _id_extraInitializers = [];
      return class Base {
        static {
          const _metadata =
            typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
          _id_decorators = [Text()];
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
          if (_metadata)
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: true,
              configurable: true,
              writable: true,
              value: _metadata,
            });
        }
        id = __runInitializers(this, _id_initializers, void 0);
        constructor() {
          __runInitializers(this, _id_extraInitializers);
        }
      };
    })();
    let Child = (() => {
      let _classSuper = Base;
      let _name_decorators;
      let _name_initializers = [];
      let _name_extraInitializers = [];
      return class Child extends _classSuper {
        static {
          const _metadata =
            typeof Symbol === "function" && Symbol.metadata
              ? Object.create(_classSuper[Symbol.metadata] ?? null)
              : void 0;
          _name_decorators = [Text()];
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
          if (_metadata)
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: true,
              configurable: true,
              writable: true,
              value: _metadata,
            });
        }
        name = __runInitializers(this, _name_initializers, void 0);
        constructor() {
          super(...arguments);
          __runInitializers(this, _name_extraInitializers);
        }
      };
    })();
    expect(registerDto(Child).map((field) => field.name)).toEqual(["id", "name"]);
    expect(registerDto(Child)).toHaveLength(2);
  });
  it("without decorator metadata the field decorator fails, saying what to import", () => {
    expect(() => {
      recordField(undefined, {
        name: "x",
        kind: "text",
        optional: false,
        settings: {},
        isPrivate: false,
      });
    }).toThrow(/dto\.no-metadata: .*graphcompose\/dto/);
  });
});
