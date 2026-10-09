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
import { file } from "../../src/components/file.js";
import { describe, expect, it } from "vitest";
import { Agent, Workflow, Injectable, ROUTER_FACTORY } from "../../src/core/index.js";
import { workflowOf, toolOf } from "../../src/testing/index.js";
import { checkGraph, createContainer } from "../../src/components/container.js";
import { recordComponent } from "../../src/components/metadata.js";
import { testConfig } from "../helpers.js";
import {
  FilesServer,
  Greeter,
  GreeterAgent,
  Greetings,
  GreetTool,
  GREETING,
} from "./fixture/components.js";
import { starOf, TestSettings } from "../fixtures/test-flow/star.js";
const services = {
  router: (name) => ({ name, route: () => Promise.reject(new Error("unused")) }),
  env: {},
};
const ctx = {
  runId: "r",
  workflow: "b",
  agent: "a",
  callId: "call-1",
  signal: new AbortController().signal,
  pause: () => ({}),
  reportCost: () => undefined,
};
const baseBundle = {
  version: "1.0.0",
  defaults: testConfig.defaults,
};
describe("components — assembly", () => {
  it("AC1: a tool is one annotated class referenced by an agent; the container injects its dependencies", async () => {
    const bundle = await workflowOf(Greetings);
    const tools = typeof bundle.tools === "function" ? bundle.tools(services) : bundle.tools;
    const greet = tools.find((tool) => tool.name === "greet");
    expect(bundle.config.agents.greeter?.tools).toEqual(["greet", "read_file"]);
    expect(await greet?.invoke({ name: "Pavel" }, ctx)).toEqual({
      kind: "ok",
      value: { text: "Shalom, Pavel" },
    });
  });
  it("AC1: a tool is testable with plain `new` and fakes — no container", async () => {
    const tool = toolOf(new GreetTool(new Greeter("Hi", services.router)));
    expect(await tool.invoke({ name: "you" }, ctx)).toEqual({
      kind: "ok",
      value: { text: "Hi, you" },
    });
    expect((await tool.invoke({ nope: 1 }, ctx)).kind).toBe("error");
  });
  it("AC2: agents (settings, prompt file with variables) and MCP servers come from their classes", async () => {
    const bundle = await workflowOf(Greetings);
    expect(bundle.config).toMatchObject({
      name: "greetings",
      version: "1.0.0",
      mcpServers: { files: { transport: "stdio", command: "files-server" } },
    });
    expect(bundle.config.agents.greeter).toMatchObject({
      model: "test/alpha",
      thinking: "low",
      description: "Greets people",
    });
    const text =
      typeof bundle.prompts.greeter === "function"
        ? await bundle.prompts.greeter({})
        : bundle.prompts.greeter;
    expect(text?.trim()).toBe("You greet people in Hebrew.");
    expect(bundle.mcpServers.map((server) => server.name)).toEqual(["files"]);
  });
});
import { Tool } from "../../src/core/index.js";
import { Person, Greeting } from "./fixture/components.js";
describe("components — policy overrides and disables", () => {
  class WGuard {}
  class AGuard {}
  class TGuard {}
  class WDisable {}
  it("Agent inherits workflow guardrails by default, or overrides them", async () => {
    let OverrideAgent = (() => {
      let _classDecorators = [
        Agent({
          name: "override_agent",
          description: "d",
          model: "test/alpha",
          price: testConfig.agents.alpha.price,
          tools: [],
          prompt: "hi",
          overrideGuardrails: [AGuard],
          disableGuardrails: [WDisable],
        }),
      ];
      let _classDescriptor;
      let _classExtraInitializers = [];
      let _classThis;
      var OverrideAgent = class {
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
          OverrideAgent = _classThis = _classDescriptor.value;
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
      return (OverrideAgent = _classThis);
    })();
    let NormalAgent = (() => {
      let _classDecorators = [
        Agent({
          name: "normal_agent",
          description: "d",
          model: "test/alpha",
          price: testConfig.agents.alpha.price,
          tools: [],
          prompt: "hi",
          guardrails: [AGuard],
        }),
      ];
      let _classDescriptor;
      let _classExtraInitializers = [];
      let _classThis;
      var NormalAgent = class {
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
          NormalAgent = _classThis = _classDescriptor.value;
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
      return (NormalAgent = _classThis);
    })();
    let W = (() => {
      let _classDecorators = [
        Workflow({
          ...baseBundle,
          name: "w",
          flow: starOf(OverrideAgent, NormalAgent),
          guardrails: [WGuard, WDisable],
        }),
      ];
      let _classDescriptor;
      let _classExtraInitializers = [];
      let _classThis;
      let _classSuper = TestSettings;
      var W = class extends _classSuper {
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
          W = _classThis = _classDescriptor.value;
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
      return (W = _classThis);
    })();
    const bundle = await workflowOf(W);
    const mockServices = { resolve: (cls) => new cls(), router: () => ({}) };
    const agentMap = bundle.guardrails?.(mockServices);
    const over = agentMap?.get("override_agent");
    expect(over?.override).toBe(true);
    expect(over?.instances.length).toBe(1);
    expect(over?.instances[0]).toBeInstanceOf(AGuard);
    expect(over?.disable).toEqual([WDisable]);
    const norm = agentMap?.get("normal_agent");
    expect(norm?.override).toBe(false);
    expect(norm?.instances.length).toBe(1);
    expect(norm?.instances[0]).toBeInstanceOf(AGuard);
    expect(norm?.disable).toEqual([]);
  });
  it("Tool inherits workflow and agent guardrails by default, or overrides them", async () => {
    let T1 = (() => {
      let _classDecorators = [
        Tool({
          name: "t1",
          description: "d",
          input: Person,
          output: Greeting,
          overrideGuardrails: [TGuard],
          disableGuardrails: [WDisable],
        }),
      ];
      let _classDescriptor;
      let _classExtraInitializers = [];
      let _classThis;
      var T1 = class {
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
          T1 = _classThis = _classDescriptor.value;
          if (_metadata)
            Object.defineProperty(_classThis, Symbol.metadata, {
              enumerable: true,
              configurable: true,
              writable: true,
              value: _metadata,
            });
          __runInitializers(_classThis, _classExtraInitializers);
        }
        async run(input, ctx) {
          return { kind: "ok", value: {} };
        }
      };
      return (T1 = _classThis);
    })();
    let A1 = (() => {
      let _classDecorators = [
        Agent({
          name: "a1",
          description: "d",
          model: "test/alpha",
          price: testConfig.agents.alpha.price,
          tools: [T1],
          prompt: "hi",
        }),
      ];
      let _classDescriptor;
      let _classExtraInitializers = [];
      let _classThis;
      var A1 = class {
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
          A1 = _classThis = _classDescriptor.value;
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
      return (A1 = _classThis);
    })();
    let W2 = (() => {
      let _classDecorators = [
        Workflow({
          ...baseBundle,
          name: "w2",
          flow: starOf(A1),
          guardrails: [WGuard, WDisable],
        }),
      ];
      let _classDescriptor;
      let _classExtraInitializers = [];
      let _classThis;
      let _classSuper = TestSettings;
      var W2 = class extends _classSuper {
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
          W2 = _classThis = _classDescriptor.value;
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
      return (W2 = _classThis);
    })();
    const bundle = await workflowOf(W2);
    const mockServices = { resolve: (cls) => new cls(), router: () => ({}) };
    const toolMap = bundle.toolGuardrails?.(mockServices);
    const tGuard = toolMap?.get("t1");
    expect(tGuard?.override).toBe(true);
    expect(tGuard?.instances.length).toBe(1);
    expect(tGuard?.instances[0]).toBeInstanceOf(TGuard);
    expect(tGuard?.disable).toEqual([WDisable]);
  });
});
describe("components — errors at assembly", () => {
  it("AC3: unknown prompt variables fail at assembly", async () => {
    let Tester = (() => {
      let _classDecorators = [
        Agent({
          name: "tester",
          description: "d",
          model: "test/alpha",
          price: testConfig.agents.alpha.price,
          tools: [],
          prompt: "Hello {{unknown_var}}",
          promptVars: {},
        }),
      ];
      let _classDescriptor;
      let _classExtraInitializers = [];
      let _classThis;
      var Tester = class {
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
          Tester = _classThis = _classDescriptor.value;
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
      return (Tester = _classThis);
    })();
    let TesterFlow = (() => {
      let _classDecorators = [
        Workflow({
          ...baseBundle,
          name: "tester-flow",
          flow: starOf(Tester),
        }),
      ];
      let _classDescriptor;
      let _classExtraInitializers = [];
      let _classThis;
      let _classSuper = TestSettings;
      var TesterFlow = class extends _classSuper {
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
          TesterFlow = _classThis = _classDescriptor.value;
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
      return (TesterFlow = _classThis);
    })();
    await expect(workflowOf(TesterFlow)).rejects.toThrow(
      '@Agent "tester": unknown prompt variable {{unknown_var}}',
    );
  });
  it("AC3: an unregistered provider names the component", async () => {
    let NoProviders = (() => {
      let _classDecorators = [
        Workflow({
          ...baseBundle,
          name: "no-providers",
          flow: starOf(GreeterAgent),
          mcp: [FilesServer],
        }),
      ];
      let _classDescriptor;
      let _classExtraInitializers = [];
      let _classThis;
      let _classSuper = TestSettings;
      var NoProviders = class extends _classSuper {
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
          NoProviders = _classThis = _classDescriptor.value;
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
      return (NoProviders = _classThis);
    })();
    await expect(workflowOf(NoProviders)).rejects.toThrow(
      'GreetTool: "Greeter" is not registered in @Workflow({ providers })',
    );
  });
  it("AC3: a dependency cycle names the chain", () => {
    const deps = {};
    let A = (() => {
      let _classDecorators = [Injectable({ deps: [] })];
      let _classDescriptor;
      let _classExtraInitializers = [];
      let _classThis;
      var A = class {
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
          A = _classThis = _classDescriptor.value;
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
      return (A = _classThis);
    })();
    let B = (() => {
      let _classDecorators = [Injectable({ deps: [] })];
      let _classDescriptor;
      let _classExtraInitializers = [];
      let _classThis;
      var B = class {
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
          B = _classThis = _classDescriptor.value;
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
      return (B = _classThis);
    })();
    recordComponent(A, { kind: "injectable", meta: { deps: [B] } });
    recordComponent(B, { kind: "injectable", meta: { deps: [A] } });
    expect(() => {
      checkGraph([A], [A, B], []);
    }).toThrow("Dependency cycle: A → B → A");
    expect(deps).toEqual({});
  });
  it("AC3: a non-component in tools fails", async () => {
    class Plain {
      plain = true;
    }
    const agent = (prompt, tools = []) => {
      let A = (() => {
        let _classDecorators = [
          Agent({
            name: "a",
            description: "d",
            model: "test/alpha",
            price: testConfig.agents.alpha.price,
            tools,
            prompt: prompt,
          }),
        ];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis;
        var A = class {
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
            A = _classThis = _classDescriptor.value;
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
        return (A = _classThis);
      })();
      return A;
    };
    const bundleWith = (agentClass) => {
      let B = (() => {
        let _classDecorators = [Workflow({ ...baseBundle, name: "x", flow: starOf(agentClass) })];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis;
        let _classSuper = TestSettings;
        var B = class extends _classSuper {
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
            B = _classThis = _classDescriptor.value;
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
        return (B = _classThis);
      })();
      return B;
    };
    const prompt = file("./fixture/greeter.prompt.md");
    await expect(workflowOf(bundleWith(agent(prompt, [Plain])))).rejects.toThrow(
      /Plain in an agent's tools is not a @Tool/,
    );
  });
  it("AC3: instances are created once, dependencies before dependants", () => {
    const container = createContainer(
      [Greeter, { provide: GREETING, useValue: "Hey" }],
      new Map([[ROUTER_FACTORY, services.router]]),
    );
    const first = container.get(GreetTool);
    expect(container.get(GreetTool)).toBe(first);
    expect(container.created).toEqual(["Greeter", "GreetTool"]);
  });
});
