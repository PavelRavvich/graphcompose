/**
 * Public API of the routers module. Everything outside src/routers imports from here only
 * (lint-enforced); routers themselves never import graph, agents or prompts.
 */
export { createRouter, withTrivialOptions, type RouterFactories } from "./create-router.js";
export { createJevRouter, type JevRouterDeps } from "./jev-router.js";
export { createLlmRouter, type LlmRouterDeps } from "./llm-router.js";
export { routerPromptTexts } from "./prompts.js";
export type { RouteOption, RouteOutcome, RouteRequest, Router, RouterDecision } from "./types.js";
