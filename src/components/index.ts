/** Angular-style components: annotated classes wired by a `@Bundle` module (Wiki → Components). */
export { bundleOf, ENV, ROUTER_FACTORY, toolOf } from "./assemble.js";
export {
  Agent,
  Bundle,
  Injectable,
  McpServer,
  McpTool,
  Tool,
  type ToolHandler,
} from "./decorators.js";
export { InjectionToken, type Class, type Provider, type Token } from "./injection.js";
export { ComponentError, componentOf } from "./metadata.js";
export type { AgentMeta, BundleMeta } from "./meta-types.js";
