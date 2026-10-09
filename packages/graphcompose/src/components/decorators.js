import { callerFile } from "./call-site.js";
import { recordComponent, componentOf, ComponentError } from "./metadata.js";
/** A tool: one class implementing `ToolHandler`, dependencies through the constructor. */
export function Tool(options) {
  return (value) => {
    recordComponent(value, { kind: "tool", meta: { ...options, deps: options.deps ?? [] } });
    return value;
  };
}
/** A class the container creates for others (a judge, a client, …). */
export function Injectable(options = {}) {
  return (value) => {
    recordComponent(value, { kind: "injectable", meta: { deps: options.deps ?? [] } });
    return value;
  };
}
/**
 * An MCP server the workflow connects to: its launch config and the server tools the workflow uses
 * (`tools`), which type the class's `call` (`extends McpServerClient<typeof tools>`).
 */
export function McpServer(options) {
  return (value) => {
    const { name, tools, ...config } = options;
    recordComponent(value, { kind: "mcp-server", meta: { name, config, tools } });
    return value;
  };
}
/**
 * A tool backed by an MCP server: like `@Tool` (implements `ToolHandler`, dependencies through the
 * constructor) with its server's client among `deps`; `run` calls the server's tools through it.
 */
export function McpTool(options) {
  return (value) => {
    const { server, ...tool } = options;
    recordComponent(value, { kind: "mcp-tool", meta: { ...tool, deps: tool.deps ?? [], server } });
    return value;
  };
}
/**
 * A knowledge base: a class implementing `RagConnector`. `topK` (passages per retrieval) is required —
 * there is no default. Agents bind it with a required `mode`: `rag: [{ use: CompanyDocs, mode: "tool" }]`.
 */
export function Rag(options) {
  return (value) => {
    recordComponent(value, { kind: "rag", meta: { ...options, deps: options.deps ?? [] } });
    return value;
  };
}
/** An agent: its settings, its tools (class references) and its prompt file. */
export function Agent(options) {
  const source = callerFile();
  return (value) => {
    recordComponent(value, {
      kind: "agent",
      meta: { ...options, ...(source === undefined ? {} : { source }) },
    });
    return value;
  };
}
/**
 * The module of a workflow (Angular `@NgModule`-like): its flow and settings. The class
 * `implements WorkflowDefinition` (`settings()`). Assemble with `workflowOf`.
 */
export function Workflow(options) {
  return (value) => {
    recordComponent(value, { kind: "workflow", meta: options });
    return value;
  };
}
export function WorkflowAction(options) {
  return (value) => {
    recordComponent(value, {
      kind: "action",
      meta: options,
    });
    return value;
  };
}
export function Channel(options) {
  return (value) => {
    recordComponent(value, {
      kind: "channel",
      meta: { ...options, deps: options.deps ?? [] },
    });
    return value;
  };
}
const boundTools = new WeakMap();
export const getBoundTools = (target) => {
  return boundTools.get(target) || {};
};
export function BindTool(tool, options) {
  return function (target, propertyKey, descriptor) {
    let toolName;
    if (typeof tool === "string") {
      toolName = tool;
    } else {
      const meta = componentOf(tool);
      if (meta?.kind !== "tool" && meta?.kind !== "mcp-tool") {
        throw new ComponentError("@BindTool expects a @Tool, @McpTool, or a string");
      }
      toolName = meta.meta.name;
    }
    let agentName;
    if (options?.agent) {
      if (typeof options.agent === "string") {
        agentName = options.agent;
      } else {
        const agentMeta = componentOf(options.agent);
        if (agentMeta?.kind !== "agent") {
          throw new ComponentError("@BindTool agent option expects an @Agent or a string");
        }
        agentName = agentMeta.meta.name;
      }
    }
    const handlers = boundTools.get(target) || {};
    if (!handlers[toolName]) {
      handlers[toolName] = [];
    }
    handlers[toolName].push({ methodName: propertyKey, agent: agentName });
    boundTools.set(target, handlers);
  };
}
export function PiiPolicy(options) {
  return (value) => {
    recordComponent(value, {
      kind: "pii-policy",
      meta: { name: options.name, deps: options.deps ?? [] },
    });
    return value;
  };
}
export function Guardrail(options) {
  return (value) => {
    recordComponent(value, {
      kind: "guardrail",
      meta: { name: options.name, deps: options.deps ?? [] },
    });
    return value;
  };
}
export function InboundChannelAdapter(options) {
  return (value) => {
    recordComponent(value, {
      kind: "inbound-adapter",
      meta: { name: options.name, deps: options.deps ?? [] },
    });
    return value;
  };
}
export function SemanticInboundChannelAdapter(options) {
  return (value) => {
    recordComponent(value, {
      kind: "semantic-inbound-adapter",
      meta: { ...options, deps: options.deps ?? [] },
    });
    return value;
  };
}
