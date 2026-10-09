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
  Agent,
  Workflow,
  Injectable,
  InjectionToken,
  ROUTER_FACTORY,
} from "../../../src/core/index.js";
import { McpServer, McpServerClient, McpTool } from "../../../src/mcp/index.js";
import { Tool } from "../../../src/tool/index.js";
import { Text } from "../../../src/dto/index.js";
import { testConfig } from "../../helpers.js";
import { starOf, TestSettings } from "../../fixtures/test-flow/star.js";
export const GREETING = new InjectionToken("GREETING");
let Greeter = (() => {
  let _classDecorators = [Injectable({ deps: [GREETING, ROUTER_FACTORY] })];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Greeter = class {
    static {
      _classThis = this;
    }
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
      __esDecorate(
        null,
        (_classDescriptor = { value: _classThis }),
        _classDecorators,
        { kind: "class", name: _classThis.name, metadata: _metadata },
        null,
        _classExtraInitializers,
      );
      Greeter = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
    greeting;
    router;
    constructor(greeting, router) {
      this.greeting = greeting;
      this.router = router;
    }
    greet(name) {
      return `${this.greeting}, ${name}`;
    }
  };
  return (Greeter = _classThis);
})();
export { Greeter };
let Person = (() => {
  let _name_decorators;
  let _name_initializers = [];
  let _name_extraInitializers = [];
  return class Person {
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
      _name_decorators = [Text({ prompt: "who to greet" })];
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
      __runInitializers(this, _name_extraInitializers);
    }
  };
})();
export { Person };
let Greeting = (() => {
  let _text_decorators;
  let _text_initializers = [];
  let _text_extraInitializers = [];
  return class Greeting {
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
      _text_decorators = [Text()];
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
      if (_metadata)
        Object.defineProperty(this, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
    }
    text = __runInitializers(this, _text_initializers, void 0);
    constructor() {
      __runInitializers(this, _text_extraInitializers);
    }
  };
})();
export { Greeting };
let GreetTool = (() => {
  let _classDecorators = [
    Tool({
      name: "greet",
      description: "Greets a person.",
      input: Person,
      output: Greeting,
      deps: [Greeter],
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var GreetTool = class {
    static {
      _classThis = this;
    }
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
      __esDecorate(
        null,
        (_classDescriptor = { value: _classThis }),
        _classDecorators,
        { kind: "class", name: _classThis.name, metadata: _metadata },
        null,
        _classExtraInitializers,
      );
      GreetTool = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
    greeter;
    constructor(greeter) {
      this.greeter = greeter;
    }
    run(input) {
      return Promise.resolve({ text: this.greeter.greet(input.name) });
    }
  };
  return (GreetTool = _classThis);
})();
export { GreetTool };
let FileRead = (() => {
  let _path_decorators;
  let _path_initializers = [];
  let _path_extraInitializers = [];
  return class FileRead {
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
    constructor() {
      __runInitializers(this, _path_extraInitializers);
    }
  };
})();
let FileContent = (() => {
  let _text_decorators;
  let _text_initializers = [];
  let _text_extraInitializers = [];
  return class FileContent {
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
      _text_decorators = [Text()];
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
      if (_metadata)
        Object.defineProperty(this, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
    }
    text = __runInitializers(this, _text_initializers, void 0);
    constructor() {
      __runInitializers(this, _text_extraInitializers);
    }
  };
})();
const filesTools = { read: { input: FileRead, output: FileContent } };
let FilesServer = (() => {
  let _classDecorators = [
    McpServer({
      name: "files",
      transport: "stdio",
      command: "files-server",
      tools: filesTools,
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  let _classSuper = McpServerClient;
  var FilesServer = class extends _classSuper {
    static {
      _classThis = this;
    }
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata
          ? Object.create(_classSuper[Symbol.metadata] ?? null)
          : void 0;
      __esDecorate(
        null,
        (_classDescriptor = { value: _classThis }),
        _classDecorators,
        { kind: "class", name: _classThis.name, metadata: _metadata },
        null,
        _classExtraInitializers,
      );
      FilesServer = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
  };
  return (FilesServer = _classThis);
})();
export { FilesServer };
let ReadFile = (() => {
  let _classDecorators = [
    McpTool({
      server: FilesServer,
      name: "read_file",
      description: "Read a file.",
      input: FileRead,
      output: FileContent,
      deps: [FilesServer],
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var ReadFile = class {
    static {
      _classThis = this;
    }
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
      __esDecorate(
        null,
        (_classDescriptor = { value: _classThis }),
        _classDecorators,
        { kind: "class", name: _classThis.name, metadata: _metadata },
        null,
        _classExtraInitializers,
      );
      ReadFile = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
    files;
    constructor(files) {
      this.files = files;
    }
    run(file) {
      return this.files.call("read", file);
    }
  };
  return (ReadFile = _classThis);
})();
export { ReadFile };
let GreeterAgent = (() => {
  let _classDecorators = [
    Agent({
      name: "greeter",
      description: "Greets people",
      model: "test/alpha",
      price: testConfig.agents.alpha.price,
      thinking: "low",
      tools: [GreetTool, ReadFile],
      promptUrls: ["./greeter.prompt.md"],
      promptVariables: { language: "Hebrew" },
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var GreeterAgent = class {
    static {
      _classThis = this;
    }
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
      __esDecorate(
        null,
        (_classDescriptor = { value: _classThis }),
        _classDecorators,
        { kind: "class", name: _classThis.name, metadata: _metadata },
        null,
        _classExtraInitializers,
      );
      GreeterAgent = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
  };
  return (GreeterAgent = _classThis);
})();
export { GreeterAgent };
let Greetings = (() => {
  let _classDecorators = [
    Workflow({
      name: "greetings",
      version: "1.0.0",
      defaults: testConfig.defaults,
      flow: starOf(GreeterAgent),
      mcp: [FilesServer],
      providers: [Greeter, { provide: GREETING, useValue: "Shalom" }],
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  let _classSuper = TestSettings;
  var Greetings = class extends _classSuper {
    static {
      _classThis = this;
    }
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata
          ? Object.create(_classSuper[Symbol.metadata] ?? null)
          : void 0;
      __esDecorate(
        null,
        (_classDescriptor = { value: _classThis }),
        _classDecorators,
        { kind: "class", name: _classThis.name, metadata: _metadata },
        null,
        _classExtraInitializers,
      );
      Greetings = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
  };
  return (Greetings = _classThis);
})();
export { Greetings };
