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
/** #118 AC5: tools and MCP servers on DTOs — validation at the edge, DTO-shaped data inside. */
import { describe, expect, it } from "vitest";
import { Agent, Workflow } from "../../src/core/index.js";
import { McpServer, McpServerClient } from "../../src/mcp/index.js";
import { mcpServerStub } from "../../src/testing/index.js";
import { Tool } from "../../src/tool/index.js";
import { toolOf, workflowOf } from "../../src/testing/index.js";
import { DtoError, Integer, ListOf, Nested, Text, Url } from "../../src/dto/index.js";
import { toolDefinitionOf } from "../../src/tools/index.js";
import { testConfig } from "../helpers.js";
import { starOf, TestSettings } from "../fixtures/test-flow/star.js";
const ctx = {
  runId: "r",
  workflow: "w",
  agent: "a",
  callId: "call-1",
  signal: new AbortController().signal,
  pause: () => ({}),
  reportCost: () => undefined,
};
let Link = (() => {
  let _url_decorators;
  let _url_initializers = [];
  let _url_extraInitializers = [];
  return class Link {
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
      _url_decorators = [Url({ prompt: "the job's link" })];
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
let JobPick = (() => {
  let _jobs_decorators;
  let _jobs_initializers = [];
  let _jobs_extraInitializers = [];
  let _count_decorators;
  let _count_initializers = [];
  let _count_extraInitializers = [];
  return class JobPick {
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
      _jobs_decorators = [ListOf(Link, { prompt: "the jobs to keep", minItems: 1 })];
      _count_decorators = [Integer({ prompt: "how many at most", min: 1, default: 2 })];
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
      if (_metadata)
        Object.defineProperty(this, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
    }
    jobs = __runInitializers(this, _jobs_initializers, void 0);
    count =
      (__runInitializers(this, _jobs_extraInitializers),
      __runInitializers(this, _count_initializers, void 0));
    constructor() {
      __runInitializers(this, _count_extraInitializers);
    }
  };
})();
let JobKept = (() => {
  let _kept_decorators;
  let _kept_initializers = [];
  let _kept_extraInitializers = [];
  return class JobKept {
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
      _kept_decorators = [ListOf(Text)];
      __esDecorate(
        null,
        null,
        _kept_decorators,
        {
          kind: "field",
          name: "kept",
          static: false,
          private: false,
          access: {
            has: (obj) => "kept" in obj,
            get: (obj) => obj.kept,
            set: (obj, value) => {
              obj.kept = value;
            },
          },
          metadata: _metadata,
        },
        _kept_initializers,
        _kept_extraInitializers,
      );
      if (_metadata)
        Object.defineProperty(this, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
    }
    kept = __runInitializers(this, _kept_initializers, void 0);
    constructor() {
      __runInitializers(this, _kept_extraInitializers);
    }
  };
})();
let KeepJobs = (() => {
  let _classDecorators = [
    Tool({ name: "keep_jobs", description: "Keeps the jobs.", input: JobPick, output: JobKept }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var KeepJobs = class {
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
      KeepJobs = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
    seen = [];
    run(pick) {
      this.seen.push(pick);
      return Promise.resolve({ kept: pick.jobs.slice(0, pick.count).map((job) => job.url) });
    }
  };
  return (KeepJobs = _classThis);
})();
describe("tools on DTOs (#118)", () => {
  it("AC5: valid model arguments → run gets the DTO-shaped object (defaults filled)", async () => {
    const keep = new KeepJobs();
    const result = await toolOf(keep).invoke({ jobs: [{ url: "https://a.io/1" }] }, ctx);
    expect(keep.seen).toEqual([{ jobs: [{ url: "https://a.io/1" }], count: 2 }]);
    expect(result).toEqual({ kind: "ok", value: { kept: ["https://a.io/1"] } });
  });
  it("AC5: invalid model arguments → the tool-error result with the indexed path; run is not called", async () => {
    const keep = new KeepJobs();
    const jobs = [{ url: "https://a.io/1" }, { url: "https://a.io/2" }, { url: "nope" }];
    expect(await toolOf(keep).invoke({ jobs }, ctx)).toEqual({
      kind: "error",
      message: expect.stringMatching(/^invalid input: jobs\[2\]\.url: /),
    });
    expect(keep.seen).toEqual([]);
  });
  it("AC5: the model sees the DTO's JSON Schema — prompts as descriptions, no $schema", () => {
    const exposed = toolDefinitionOf(toolOf(new KeepJobs())).function.parameters;
    expect(exposed).toMatchObject({
      type: "object",
      properties: {
        jobs: { description: "the jobs to keep", minItems: 1 },
        count: { description: "how many at most", default: 2 },
      },
      required: ["jobs"],
    });
    expect(exposed).not.toHaveProperty("$schema");
  });
  it("AC5: a tool whose DTO has an undecorated field stops the workflow's assembly", async () => {
    let Loose = (() => {
      let _query_decorators;
      let _query_initializers = [];
      let _query_extraInitializers = [];
      return class Loose {
        static {
          const _metadata =
            typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
          _query_decorators = [Text()];
          __esDecorate(
            null,
            null,
            _query_decorators,
            {
              kind: "field",
              name: "query",
              static: false,
              private: false,
              access: {
                has: (obj) => "query" in obj,
                get: (obj) => obj.query,
                set: (obj, value) => {
                  obj.query = value;
                },
              },
              metadata: _metadata,
            },
            _query_initializers,
            _query_extraInitializers,
          );
          if (_metadata)
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: true,
              configurable: true,
              writable: true,
              value: _metadata,
            });
        }
        query = __runInitializers(this, _query_initializers, void 0);
        extra = __runInitializers(this, _query_extraInitializers);
      };
    })();
    let LooseTool = (() => {
      let _classDecorators = [
        Tool({ name: "loose", description: "d", input: Loose, output: JobKept }),
      ];
      let _classDescriptor;
      let _classExtraInitializers = [];
      let _classThis;
      var LooseTool = class {
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
          LooseTool = _classThis = _classDescriptor.value;
          if (_metadata)
            Object.defineProperty(_classThis, Symbol.metadata, {
              enumerable: true,
              configurable: true,
              writable: true,
              value: _metadata,
            });
          __runInitializers(_classThis, _classExtraInitializers);
        }
        run() {
          return Promise.resolve({ kept: [] });
        }
      };
      return (LooseTool = _classThis);
    })();
    let LooseAgent = (() => {
      let _classDecorators = [
        Agent({
          name: "a",
          description: "d",
          model: "test/alpha",
          price: testConfig.agents.alpha.price,
          tools: [LooseTool],
          prompt: "./fixture/greeter.prompt.md",
        }),
      ];
      let _classDescriptor;
      let _classExtraInitializers = [];
      let _classThis;
      var LooseAgent = class {
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
          LooseAgent = _classThis = _classDescriptor.value;
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
      return (LooseAgent = _classThis);
    })();
    let LooseWorkflow = (() => {
      let _classDecorators = [
        Workflow({
          name: "loose",
          version: "1",
          defaults: testConfig.defaults,
          flow: starOf(LooseAgent),
        }),
      ];
      let _classDescriptor;
      let _classExtraInitializers = [];
      let _classThis;
      let _classSuper = TestSettings;
      var LooseWorkflow = class extends _classSuper {
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
          LooseWorkflow = _classThis = _classDescriptor.value;
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
      return (LooseWorkflow = _classThis);
    })();
    await expect(workflowOf(LooseWorkflow)).rejects.toThrow(DtoError);
    await expect(workflowOf(LooseWorkflow)).rejects.toThrow(
      /dto\.undecorated-field: Loose: .*extra/,
    );
  });
});
let Ticket = (() => {
  let _id_decorators;
  let _id_initializers = [];
  let _id_extraInitializers = [];
  return class Ticket {
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
let TicketState = (() => {
  let _ticket_decorators;
  let _ticket_initializers = [];
  let _ticket_extraInitializers = [];
  let _state_decorators;
  let _state_initializers = [];
  let _state_extraInitializers = [];
  return class TicketState {
    static {
      const _metadata =
        typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
      _ticket_decorators = [Nested(Ticket)];
      _state_decorators = [Text()];
      __esDecorate(
        null,
        null,
        _ticket_decorators,
        {
          kind: "field",
          name: "ticket",
          static: false,
          private: false,
          access: {
            has: (obj) => "ticket" in obj,
            get: (obj) => obj.ticket,
            set: (obj, value) => {
              obj.ticket = value;
            },
          },
          metadata: _metadata,
        },
        _ticket_initializers,
        _ticket_extraInitializers,
      );
      __esDecorate(
        null,
        null,
        _state_decorators,
        {
          kind: "field",
          name: "state",
          static: false,
          private: false,
          access: {
            has: (obj) => "state" in obj,
            get: (obj) => obj.state,
            set: (obj, value) => {
              obj.state = value;
            },
          },
          metadata: _metadata,
        },
        _state_initializers,
        _state_extraInitializers,
      );
      if (_metadata)
        Object.defineProperty(this, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
    }
    ticket = __runInitializers(this, _ticket_initializers, void 0);
    state =
      (__runInitializers(this, _ticket_extraInitializers),
      __runInitializers(this, _state_initializers, void 0));
    constructor() {
      __runInitializers(this, _state_extraInitializers);
    }
  };
})();
const deskTools = { status: { input: Ticket, output: TicketState } };
let DeskServer = (() => {
  let _classDecorators = [
    McpServer({ name: "desk", transport: "stdio", command: "desk", tools: deskTools }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  let _classSuper = McpServerClient;
  var DeskServer = class extends _classSuper {
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
      DeskServer = _classThis = _classDescriptor.value;
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
  return (DeskServer = _classThis);
})();
describe("MCP servers on DTOs (#118)", () => {
  it("AC5: call is typed by the DTOs and returns what the server answered", async () => {
    const desk = mcpServerStub(DeskServer, {
      status: ({ id }) => Promise.resolve({ ticket: { id }, state: "open" }),
    });
    expect(await desk.call("status", { id: "T-1" })).toEqual({
      ticket: { id: "T-1" },
      state: "open",
    });
  });
});
