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
import {
  Agent,
  Guardrail,
  Injectable,
  PiiPolicy,
  Tool,
  Workflow,
  WorkflowAction,
} from "../../src/core/index.js";
import { from } from "../../src/router/index.js";
import { WorkflowStart, WorkflowFinish } from "../../src/graph/index.js";
import { WorkflowStartText, WorkflowFinishText, Text } from "../../src/dto/index.js";
import { buildApp } from "../../src/app/create-app.js";
import { workflowOf } from "../../src/components/assemble.js";
import { createScriptedGateway } from "../../src/testing/scripted-gateway.js";
import { ScriptBook } from "../../src/testing/script-book.js";
import { replyWith, callTool } from "../../src/testing/index.js";
import { testConfig } from "../helpers.js";
import { TestSettings } from "../fixtures/test-flow/star.js";
let ToolInput = (() => {
  let _text_decorators;
  let _text_initializers = [];
  let _text_extraInitializers = [];
  return class ToolInput {
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
const hookEvents = [];
let TailsObserver = (() => {
  let _classDecorators = [Injectable()];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var TailsObserver = class {
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
      TailsObserver = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
    async onWorkflowStart() {
      hookEvents.push("WorkflowStart");
    }
    async onWorkflowEnd() {
      hookEvents.push("WorkflowEnd");
    }
    async onAgentStart(ctx) {
      hookEvents.push(`AgentStart:${ctx.name}`);
    }
    async onAgentEnd(ctx) {
      hookEvents.push(`AgentEnd:${ctx.name}`);
    }
    async onToolStart(ctx) {
      hookEvents.push(`ToolStart:${ctx.toolName}`);
    }
    async onToolEnd(ctx) {
      hookEvents.push(`ToolEnd:${ctx.toolName}`);
    }
    async onActionStart(ctx) {
      hookEvents.push(`ActionStart:${ctx.name}`);
    }
    async onActionEnd(ctx) {
      hookEvents.push(`ActionEnd:${ctx.name}`);
    }
    async onGuardrailStart(ctx) {
      hookEvents.push(`GuardrailStart:${ctx.name}`);
    }
    async onGuardrailEnd(ctx) {
      hookEvents.push(`GuardrailEnd:${ctx.name}`);
    }
    async onPiiPolicyStart(ctx) {
      hookEvents.push(`PiiStart:${ctx.name}`);
    }
    async onPiiPolicyEnd(ctx) {
      hookEvents.push(`PiiEnd:${ctx.name}`);
    }
    async onChannelStart(ctx) {
      hookEvents.push(`ChannelStart:${ctx.name}`);
    }
    async onChannelEnd(ctx) {
      hookEvents.push(`ChannelEnd:${ctx.name}`);
    }
  };
  return (TailsObserver = _classThis);
})();
let MaskingPolicy = (() => {
  let _classDecorators = [PiiPolicy({ name: "MaskingPolicy" })];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var MaskingPolicy = class {
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
      MaskingPolicy = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
    async mask(text) {
      return text;
    }
    async unmask(text) {
      return text;
    }
  };
  return (MaskingPolicy = _classThis);
})();
let SafeGuard = (() => {
  let _classDecorators = [Guardrail({ name: "SafeGuard" })];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var SafeGuard = class {
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
      SafeGuard = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
    async beforeToolCall() {}
    async afterToolCall() {}
  };
  return (SafeGuard = _classThis);
})();
let SafeTool = (() => {
  let _classDecorators = [
    Tool({
      name: "SafeTool",
      description: "Does things",
      input: ToolInput,
      output: ToolInput,
      deps: [TailsObserver],
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var SafeTool = class {
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
      SafeTool = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
    obs;
    constructor(obs) {
      this.obs = obs;
    }
    async run() {
      return { text: "done" };
    }
  };
  return (SafeTool = _classThis);
})();
let SafeAgent = (() => {
  let _classDecorators = [
    Agent({
      name: "SafeAgent",
      description: "test agent",
      model: "test",
      tools: [SafeTool],
      pii: [MaskingPolicy],
      guardrails: [SafeGuard],
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var SafeAgent = class {
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
      SafeAgent = _classThis = _classDescriptor.value;
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
  return (SafeAgent = _classThis);
})();
let FormatAction = (() => {
  let _classDecorators = [WorkflowAction({ name: "FormatAction" })];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var FormatAction = class {
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
      FormatAction = _classThis = _classDescriptor.value;
      if (_metadata)
        Object.defineProperty(_classThis, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
      __runInitializers(_classThis, _classExtraInitializers);
    }
    async execute() {
      return { payload: { format: true } };
    }
  };
  return (FormatAction = _classThis);
})();
let StartNode = (() => {
  let _classDecorators = [WorkflowStart({ name: "Start", input: WorkflowStartText })];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var StartNode = class {
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
      StartNode = _classThis = _classDescriptor.value;
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
  return (StartNode = _classThis);
})();
let FinishNode = (() => {
  let _classDecorators = [WorkflowFinish({ name: "Finish", output: WorkflowFinishText })];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var FinishNode = class {
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
      FinishNode = _classThis = _classDescriptor.value;
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
  return (FinishNode = _classThis);
})();
let TailsWorkflow = (() => {
  let _classDecorators = [
    Workflow({
      name: "tails-test",
      version: "1.0.0",
      defaults: testConfig.defaults,
      providers: [TailsObserver],
      flow: [
        from(StartNode).next(SafeAgent),
        from(SafeAgent).next(FormatAction),
        from(FormatAction).next(FinishNode),
      ],
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  let _classSuper = TestSettings;
  var TailsWorkflow = class extends _classSuper {
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
      TailsWorkflow = _classThis = _classDescriptor.value;
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
  return (TailsWorkflow = _classThis);
})();
describe("Observability Tails Hooks", () => {
  it("fires tails hooks in precise order", async () => {
    hookEvents.length = 0;
    const book = new ScriptBook();
    book
      .scriptOf("agent:SafeAgent")
      .thenReturn(callTool(SafeTool, { text: "hello" }), replyWith("Hello user!"));
    const { app, deps } = await buildApp(await workflowOf(TailsWorkflow), {
      gateway: createScriptedGateway(book),
    });
    deps.tools("SafeTool");
    await app.execute(StartNode, { text: "hi" });
    // Assert the exact flow
    // Workflow -> Agent -> Pii -> Guardrail -> Tool -> Guardrail -> Pii -> Agent -> Action -> WorkflowEnd
    // Check Action
    console.log("HOOK EVENTS:", hookEvents);
    expect(hookEvents).toContain("ActionStart:FormatAction");
    expect(hookEvents).toContain("ActionEnd:FormatAction");
    // Order assertions
    const agentStart = hookEvents.indexOf("AgentStart:SafeAgent");
    const piiStart = hookEvents.indexOf("PiiStart:MaskingPolicy");
    const guardrailStart = hookEvents.indexOf("GuardrailStart:SafeGuard");
    const toolStart = hookEvents.indexOf("ToolStart:SafeTool");
    const toolEnd = hookEvents.indexOf("ToolEnd:SafeTool");
    const guardrailEnd = hookEvents.indexOf("GuardrailEnd:SafeGuard");
    const agentEnd = hookEvents.indexOf("AgentEnd:SafeAgent");
    expect(agentStart).toBeLessThan(guardrailStart);
    expect(guardrailStart).toBeLessThan(toolStart);
    expect(toolStart).toBeLessThan(toolEnd);
    const guardrailEnd2 = hookEvents.lastIndexOf("GuardrailEnd:SafeGuard");
    expect(toolEnd).toBeLessThan(guardrailEnd2);
    expect(guardrailEnd2).toBeLessThan(agentEnd);
    await app.close();
  });
});
