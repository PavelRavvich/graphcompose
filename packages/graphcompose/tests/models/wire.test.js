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
import { describe, expect, it } from "vitest";
import { normalisePromptText } from "../../src/graph/text.js";
import { tool } from "@langchain/core/tools";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { connectionOf } from "../../src/models/connections.js";
import { CircuitBreakers } from "../../src/models/circuit-breaker.js";
import {
  JevModelProvider,
  PromptCaching,
  Reasoning,
  toWireRequest,
} from "../../src/models/index.js";
import { modelProviderOf } from "../../src/models/model-provider.decorator.js";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Agent, Workflow } from "../../src/core/index.js";
import { workflowOf } from "../../src/testing/index.js";
import { WorkflowFinishText, WorkflowStartText } from "../../src/dto/index.js";
import { chain, WorkflowFinish, WorkflowSettings, WorkflowStart } from "../../src/graph/index.js";
import { parseWireRequest, wireFetch } from "../../src/models/wire.js";
import { TestOpenRouterProvider } from "./providers.fixture.js";
import { completion, providerStub } from "./stub.js";
let Start = (() => {
  let _classDecorators = [
    WorkflowStart({ name: "task", description: "A task", input: WorkflowStartText }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Start = class {
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
      Start = _classThis = _classDescriptor.value;
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
  return (Start = _classThis);
})();
let Finish = (() => {
  let _classDecorators = [
    WorkflowFinish({ name: "replyWith", description: "The replyWith", output: WorkflowFinishText }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Finish = class {
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
      Finish = _classThis = _classDescriptor.value;
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
  return (Finish = _classThis);
})();
const settings = {
  model: "moonshotai/kimi-k2.6",
  temperature: 0,
  maxTokens: 100,
};
const env = { OPENROUTER_API_KEY: "k" };
/** What OpenRouter receives for one call of the provider's chat model. */
async function bodyOf(bind) {
  const stub = providerStub([completion()]);
  const provider = new TestOpenRouterProvider();
  const connection = connectionOf(modelProviderOf(TestOpenRouterProvider), {
    env,
    requireKeys: true,
    breakers: new CircuitBreakers(),
    send: stub.fetch,
  });
  const model = provider.chat({
    settings,
    reasoning: Reasoning.modelDecides(),
    promptCaching: PromptCaching.off(),
    connection,
  });
  await (bind === undefined ? model : bind(model)).invoke([
    new SystemMessage("rules"),
    new HumanMessage("hi"),
  ]);
  return stub.requests[0]?.body ?? {};
}
const lookup = (name) =>
  tool(() => "x", {
    name,
    description: `${name} tool`,
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {},
    },
  });
describe("AC6: the wire form, made in one place (toWireRequest)", () => {
  it("AC6: the wire body carries the provider's typed request fields", async () => {
    const body = await bodyOf();
    expect(body).toMatchObject({
      model: "moonshotai/kimi-k2.6",
      provider: { ignore: ["Inceptron"] },
    });
  });
  it("AC6: tools go out sorted by name, their schemas without $schema", async () => {
    const body = await bodyOf(
      (model) => model.bindTools?.([lookup("zeta"), lookup("alpha"), lookup("mid")]) ?? model,
    );
    const tools = body.tools;
    expect(tools.map((t) => t.function.name)).toEqual(["alpha", "mid", "zeta"]);
    expect(tools.every((t) => !("$schema" in t.function.parameters))).toBe(true);
  });
  it("AC6: declaration order of tools changes nothing on the wire", () => {
    const fn = (name) => ({ type: "function", function: { name } });
    const plan = { fields: {}, cacheMarkers: [], cacheControl: { type: "ephemeral" } };
    expect(toWireRequest({ model: "m", tools: [fn("b"), fn("a")] }, plan)).toEqual(
      toWireRequest({ model: "m", tools: [fn("a"), fn("b")] }, plan),
    );
  });
  it("AC6: Jev routes are sent sorted by name", async () => {
    const stub = providerStub([{ body: { answers: { route: { choice: "b" } } } }]);
    const connection = connectionOf(modelProviderOf(JevModelProvider), {
      env,
      requireKeys: true,
      breakers: new CircuitBreakers(),
      send: stub.fetch,
    });
    await new JevModelProvider().routeTo({
      decision: {
        model: "typesafe/jev-1.13",
        state: "x",
        questions: {
          route: { type: "choice", instructions: "pick", criteria: { zeta: "z", alpha: "a" } },
        },
      },
      connection,
    });
    const body = stub.requests[0]?.body;
    expect(Object.keys(body.questions.route.criteria)).toEqual(["alpha", "zeta"]);
  });
  it("AC6: a body the adapter cannot read passes through untouched", async () => {
    const stub = providerStub();
    const plan = {
      fields: { x: 1 },
      cacheMarkers: [],
      cacheControl: { type: "ephemeral" },
    };
    await wireFetch(plan, stub.fetch)("http://x.test/v1/chat/completions", {
      method: "POST",
      body: "not json",
    });
    await wireFetch(plan, stub.fetch)("http://x.test/v1/models");
    expect(parseWireRequest("[1]")).toBeUndefined();
    expect(stub.requests.map((r) => r.raw)).toEqual(["not json", undefined]);
  });
});
describe("AC6: prompts are normalised at load and sent normalised", () => {
  it("AC6: an agent's prompt file is loaded normalised (BOM, edge blank lines, NFC)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gc-151-"));
    writeFileSync(join(dir, "writer.prompt.md"), "\uFEFF\n\n  Cafe\u0301 rules\n\n\tstep\n\n");
    let Writer = (() => {
      let _classDecorators = [
        Agent({
          name: "writer",
          description: "Writes",
          model: "local/llama",
          promptUrls: [join(dir, "writer.prompt.md")],
        }),
      ];
      let _classDescriptor;
      let _classExtraInitializers = [];
      let _classThis;
      var Writer = class {
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
          Writer = _classThis = _classDescriptor.value;
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
      return (Writer = _classThis);
    })();
    let Normalised = (() => {
      let _classDecorators = [
        Workflow({
          name: "normalised",
          version: "1",
          flow: [chain(Start, Writer, Finish)],
          defaults: {
            models: { temperature: 0 },
            router: { kind: "jev", model: "typesafe/jev-1.13" },
            history: { limit: 1 },
          },
        }),
      ];
      let _classDescriptor;
      let _classExtraInitializers = [];
      let _classThis;
      var Normalised = class {
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
          Normalised = _classThis = _classDescriptor.value;
          if (_metadata)
            Object.defineProperty(_classThis, Symbol.metadata, {
              enumerable: true,
              configurable: true,
              writable: true,
              value: _metadata,
            });
          __runInitializers(_classThis, _classExtraInitializers);
        }
        settings() {
          return WorkflowSettings.builder().build();
        }
      };
      return (Normalised = _classThis);
    })();
    const writer = (await workflowOf(Normalised)).prompts.writer;
    const text = typeof writer === "function" ? await writer({}) : writer;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(normalisePromptText(text)).toBe("  Caf\u00e9 rules\n\n\tstep");
  });
});
