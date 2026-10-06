/* eslint-disable complexity, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, max-lines-per-function, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */

/**
 * `graphcompose/graph` — the workflow's graph: the flow DSL (`from`, `chain`, `node`, `Self`),
 * `@WorkflowStart`, `@Router`, `@WorkflowFinish`, workflow settings and limits, and the errors
 * assembly and runs raise.
 * Wiki → Workflow, Routers.
 */
import "../polyfills/symbol-metadata.js";

export {
  chain,
  from,
  node,
  Self,
  Skip,
  type ChainStep,
  type ChoiceTarget,
  type ChooseStep,
  type Flow,
  type FlowNode,
  type FlowSource,
  type FlowStep,
  type NamedNode,
  type SelfTarget,
  type ToStep,
  required,
  background,
} from "./flow.js";
export { SELF_OPTION, type RouteDeclaration } from "./route.js";
export { WorkflowStart, type WorkflowStartOptions } from "./workflow-start.decorator.js";
export { WorkflowFinish, type WorkflowFinishOptions } from "./workflow-finish.decorator.js";
export { Router, type RouterOptions } from "./router.decorator.js";
export {
  WorkflowSettings,
  WorkflowSettingsError,
  type PerDayLimits,
  type PerRunLimits,
  type WorkflowDefinition,
  type WorkflowLimits,
  type WorkflowSettingsBuilder,
} from "./settings.js";
export { GraphRuleError, type RuleCode, type RuleViolation } from "./rule-error.js";
export { LimitExceededError, type LimitKey } from "./limits.js";
export { RouterDecisionError, type RouterFailureCode } from "./nodes/flow-router.js";
