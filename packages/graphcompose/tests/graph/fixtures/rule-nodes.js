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
import { Router } from "../../../src/graph/router.decorator.js";
import { Self } from "../../../src/graph/flow.js";
import { testNode } from "./nodes.js";
let Start = (() => {
  let _classDecorators = [testNode("workflow-start", "start")];
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
export { Start };
let A = (() => {
  let _classDecorators = [testNode("agent", "a")];
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
export { A };
let B = (() => {
  let _classDecorators = [testNode("agent", "b")];
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
export { B };
let OtherA = (() => {
  let _classDecorators = [testNode("agent", "other-a")];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var OtherA = class {
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
      OtherA = _classThis = _classDescriptor.value;
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
  return (OtherA = _classThis);
})();
export { OtherA };
/** A second class claiming the name "a". */
let AlsoNamedA = (() => {
  let _classDecorators = [testNode("agent", "a")];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var AlsoNamedA = class {
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
      AlsoNamedA = _classThis = _classDescriptor.value;
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
  return (AlsoNamedA = _classThis);
})();
export { AlsoNamedA };
let Done = (() => {
  let _classDecorators = [testNode("workflow-finish", "done")];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Done = class {
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
      Done = _classThis = _classDescriptor.value;
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
  return (Done = _classThis);
})();
export { Done };
let OtherDone = (() => {
  let _classDecorators = [testNode("workflow-finish", "other-done")];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var OtherDone = class {
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
      OtherDone = _classThis = _classDescriptor.value;
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
  return (OtherDone = _classThis);
})();
export { OtherDone };
/** Not a flow node (e.g. a tool or a channel). */
export class SomeTool {
  kind = "tool";
}
const jev = "typesafe/jev-1.13";
let Pick = (() => {
  let _classDecorators = [
    Router({
      name: "pick",
      description: "Picks A or B",
      prompt: "Pick.",
      model: jev,
      routes: [
        { prompt: "A", target: A },
        { prompt: "B", target: B },
      ],
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Pick = class {
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
      Pick = _classThis = _classDescriptor.value;
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
  return (Pick = _classThis);
})();
export { Pick };
let Gate = (() => {
  let _classDecorators = [
    Router({
      name: "gate",
      description: "Back or done",
      prompt: "Gate.",
      model: jev,
      maxVisits: 10,
      routes: [
        { prompt: "Again", target: Self },
        { prompt: "Finished", target: Done },
      ],
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Gate = class {
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
      Gate = _classThis = _classDescriptor.value;
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
  return (Gate = _classThis);
})();
export { Gate };
let Only = (() => {
  let _classDecorators = [
    Router({
      name: "only",
      description: "One route",
      prompt: "Only.",
      model: jev,
      routes: [{ prompt: "Finished", target: Done }],
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Only = class {
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
      Only = _classThis = _classDescriptor.value;
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
  return (Only = _classThis);
})();
export { Only };
let Second = (() => {
  let _classDecorators = [
    Router({
      name: "second",
      description: "Done too",
      prompt: "Second.",
      model: jev,
      routes: [
        { prompt: "A", target: A },
        { prompt: "Finished", target: Done },
      ],
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Second = class {
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
      Second = _classThis = _classDescriptor.value;
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
  return (Second = _classThis);
})();
export { Second };
let Mute = (() => {
  let _classDecorators = [
    Router({
      name: "mute",
      prompt: "",
      description: "No texts",
      model: jev,
      routes: [
        { prompt: "", target: Done },
        { prompt: "", target: A },
      ],
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Mute = class {
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
      Mute = _classThis = _classDescriptor.value;
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
  return (Mute = _classThis);
})();
export { Mute };
/** A router that sends the turn back to A or finishes — no `maxVisits`. */
let Loop = (() => {
  let _classDecorators = [
    Router({
      name: "loop",
      description: "A again or done",
      prompt: "Loop.",
      model: jev,
      routes: [
        { prompt: "A", target: A },
        { prompt: "Finished", target: Done },
      ],
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Loop = class {
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
      Loop = _classThis = _classDescriptor.value;
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
  return (Loop = _classThis);
})();
export { Loop };
/** Two routers for one cycle (`Ping → A → Pong → B → Ping`) — no `maxVisits` on either. */
let Ping = (() => {
  let _classDecorators = [
    Router({
      name: "ping",
      description: "A or done",
      prompt: "Ping.",
      model: jev,
      routes: [
        { prompt: "A", target: A },
        { prompt: "Finished", target: Done },
      ],
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Ping = class {
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
      Ping = _classThis = _classDescriptor.value;
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
  return (Ping = _classThis);
})();
export { Ping };
let Pong = (() => {
  let _classDecorators = [
    Router({
      name: "pong",
      description: "B or done",
      prompt: "Pong.",
      model: jev,
      routes: [
        { prompt: "B", target: B },
        { prompt: "Finished", target: Done },
      ],
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var Pong = class {
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
      Pong = _classThis = _classDescriptor.value;
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
  return (Pong = _classThis);
})();
export { Pong };
/** `Gate` without `maxVisits`: `Self` makes it a cycle with the agent before it. */
let UnboundedGate = (() => {
  let _classDecorators = [
    Router({
      name: "unbounded-gate",
      description: "Back or done",
      prompt: "Gate.",
      model: jev,
      routes: [
        { prompt: "Again", target: Self },
        { prompt: "Finished", target: Done },
      ],
    }),
  ];
  let _classDescriptor;
  let _classExtraInitializers = [];
  let _classThis;
  var UnboundedGate = class {
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
      UnboundedGate = _classThis = _classDescriptor.value;
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
  return (UnboundedGate = _classThis);
})();
export { UnboundedGate };
