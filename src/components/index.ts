/** Angular-style components: annotated classes wired by a `@Bundle` module (Wiki → Components). */
export { bundleOf } from "./assemble.js";
export { ENV, ROUTER_FACTORY, toolOf } from "./runtime.js";
export {
  Agent,
  Bundle,
  Injectable,
  McpServer,
  McpTool,
  Rag,
  Tool,
  type ToolHandler,
} from "./decorators.js";
export { InjectionToken, type Class, type Provider, type Token } from "./injection.js";
export { ComponentError, componentOf } from "./metadata.js";
export type { AgentMeta, BundleMeta, RagBinding } from "./meta-types.js";
