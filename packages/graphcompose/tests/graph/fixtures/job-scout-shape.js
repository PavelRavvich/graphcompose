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
import { FakeListChatModel } from "@langchain/core/utils/testing";
import { MemorySaver } from "@langchain/langgraph";
import { z } from "zod";
import { WorkflowStartText, WorkflowFinishText } from "../../../src/dto/index.js";
import { WorkflowFinish } from "../../../src/graph/workflow-finish.decorator.js";
import { WorkflowStart } from "../../../src/graph/workflow-start.decorator.js";
import { from } from "../../../src/graph/flow.js";
import { Router } from "../../../src/graph/router.decorator.js";
import { flowRouterFactory } from "../../../src/graph/router-model.js";
import { NO_GUARDS } from "../../../src/guards/index.js";
import { createModelRegistry } from "../../../src/llm/registry.js";
import { createSqliteTernStore } from "../../../src/terns/index.js";
import { defineTool } from "../../../src/tools/index.js";
import { usd } from "../../../src/units/index.js";
import { ScriptedChatModel } from "../../fakes/scripted-model.js";
import { fakeGateway, memoryLedger, testConfig } from "../../helpers.js";
import { testNode } from "./nodes.js";
let ChatWorkflowStart = (() => {
  let _classDecorators = [
    WorkflowStart({
      name: "chat",
      description: "A message from the job seeker",
      input: WorkflowStartText,
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var ChatWorkflowStart = class {
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
      ChatWorkflowStart = _classThis = _classDescriptor.value;
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
  return (ChatWorkflowStart = _classThis);
})();
let Profiler = (() => {
  let _classDecorators = [testNode("agent", "profiler")];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Profiler = class {
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
      Profiler = _classThis = _classDescriptor.value;
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
  return (Profiler = _classThis);
})();
let Scout = (() => {
  let _classDecorators = [testNode("agent", "scout")];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Scout = class {
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
      Scout = _classThis = _classDescriptor.value;
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
  return (Scout = _classThis);
})();
let Shortlist = (() => {
  let _classDecorators = [testNode("agent", "shortlist")];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Shortlist = class {
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
      Shortlist = _classThis = _classDescriptor.value;
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
  return (Shortlist = _classThis);
})();
let ChatWorkflowFinish = (() => {
  let _classDecorators = [
    WorkflowFinish({ name: "chat", description: "The replyWith", output: WorkflowFinishText }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var ChatWorkflowFinish = class {
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
      ChatWorkflowFinish = _classThis = _classDescriptor.value;
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
  return (ChatWorkflowFinish = _classThis);
})();
/** job-scout's router, on a scripted chat model ("test/router") instead of Jev. */
let MainRouter = (() => {
  let _classDecorators = [
    Router({
      name: "main",
      description: "Sends the job seeker's message to the right agent, or sends the replyWith",
      prompt: "Pick who handles the job seeker's message.",
      model: "test/router",
      maxVisits: 3,
      routes: [
        { prompt: "Reading the resume and proposing a search brief", target: Profiler },
        { prompt: "Finding and ranking jobs", target: Scout },
        { prompt: "Saving chosen jobs to the shortlist, or showing it", target: Shortlist },
        { prompt: "The last replyWith fully covers the message", target: ChatWorkflowFinish },
      ],
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var MainRouter = class {
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
      MainRouter = _classThis = _classDescriptor.value;
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
  return (MainRouter = _classThis);
})();
/** The job-scout flow (#116 approved shape) over test nodes. */
export const jobScoutFlow = [
  from(ChatWorkflowStart).next(MainRouter),
  from(MainRouter).routes(Profiler, Scout, Shortlist, ChatWorkflowFinish),
  from(Profiler, Scout, Shortlist).next(MainRouter),
];
const price = { inputPerMTok: 3, outputPerMTok: 6 };
const agent = (model, description) => ({ model, description, price });
const config = {
  ...testConfig,
  name: "job-scout",
  compaction: { every: 2, keep: 5, model: { model: "test/compactor", price } },
  agents: {
    profiler: agent("test/profiler", "Reads the resume"),
    scout: agent("test/scout", "Finds jobs"),
    shortlist: { ...agent("test/shortlist", "Saves jobs"), tools: ["save_shortlist"] },
  },
};
export function jobScoutDeps(script) {
  const saved = [];
  const models = new Map(
    Object.entries(script.agents).map(([name, replies]) => [
      `test/${name}`,
      new ScriptedChatModel(replies),
    ]),
  );
  const router = new FakeListChatModel({ responses: [...script.router] });
  const compactor = new FakeListChatModel({ responses: ["S1", "S2", "S3"] });
  const chatModel = (settings) =>
    settings.model === "test/router" ? router : (models.get(settings.model) ?? compactor);
  const saveShortlist = defineTool({
    name: "save_shortlist",
    description: "Save jobs",
    channel: "terminal",
    input: z.object({ jobs: z.array(z.string()) }),
    output: z.string(),
    run: ({ jobs }) => {
      saved.push(...jobs);
      return Promise.resolve(`saved ${String(jobs.length)}`);
    },
  });
  const ledger = memoryLedger();
  const deps = {
    config,
    registry: createModelRegistry(config, fakeGateway(chatModel)),
    prompts: {
      profiler: async () => "You profile.",
      scout: async () => "You scout.",
      shortlist: async () => "You save.",
    },
    tools: () => saveShortlist,
    guards: script.guards ?? NO_GUARDS,
    pause: { checkpointer: new MemorySaver() /* needsApproval removed */ },
    knowledge: (name) => (name === "scout" ? (script.knowledge ?? []) : []),
    flow: jobScoutFlow,
    limits: { perRun: { steps: 12, cost: usd(0.1) }, perDay: { cost: usd(1) } },
    routers: [],
    routerFor: flowRouterFactory({
      gateway: fakeGateway(chatModel),
      chatDefaults: config.defaults.models,
      chatModelSettings: (model) => ({ model, price: { inputPerMTok: 1, outputPerMTok: 2 } }),
    }),
    ledger,
    terns: createSqliteTernStore(":memory:"),
  };
  return { deps, saved, ledger, models };
}
